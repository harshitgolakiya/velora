import { randomInt } from "node:crypto";
import { CartStatus, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { z } from "zod";
import { completeCartOrder, completeCashOnDeliveryOrder } from "@/lib/cart-reservations";
import { prisma } from "@/lib/prisma";
import { getCheckoutSettings } from "@/lib/store-settings";
import { getShippingQuote } from "@/lib/shipping-settings";
import { isPaymentMethodEnabled } from "@/lib/payment-method-settings";
import { createPayPalOrder, isPayPalConfigured } from "@/lib/paypal";
import { createTabbyCheckoutSession, isTabbyConfigured } from "@/lib/tabby";
import { getCouponEligibleSubtotal } from "@/lib/coupon-eligibility";
import { getGiftCardQuote, holdGiftCardForOrder } from "@/lib/gift-cards";
import { attributeProductAlertConversions } from "@/lib/product-alert-queue";
import { attributeAutomationConversions } from "@/lib/email-delivery";
import { localizedPath } from "@/lib/i18n";
import { localeFromRequest } from "@/lib/transactional-email";
import { recordSearchConversionEvent } from "@/lib/search-analytics";
import { requireSameOriginRequest } from "@/lib/request-security";

const checkoutSchema = z.object({
  sessionKey: z.string().trim().min(12),
  email: z.email(),
  firstName: z.string().trim().min(2),
  lastName: z.string().trim().min(2),
  phone: z.string().trim().transform((value) => value.replace(/[\s-]/g, "")).pipe(
    z.string().regex(/^(?:\+971|00971|0)?5\d{8}$/),
  ),
  address: z.string().trim().min(8),
  addressLine2: z.string().trim().max(120).optional(),
  city: z.string().trim().min(2),
  emirate: z.enum([
    "Abu Dhabi",
    "Dubai",
    "Sharjah",
    "Ajman",
    "Umm Al Quwain",
    "Ras Al Khaimah",
    "Fujairah",
  ]),
  shippingMethod: z.enum(["standard", "express"]),
  paymentMethod: z.enum(["stripe", "paypal", "tabby", "cash_on_delivery"]).default("stripe"),
  couponCode: z.string().trim().optional(),
  giftCardCode: z.string().trim().optional(),
  customerNote: z.string().trim().optional(),
  searchAttribution: z.object({
    query: z.string().trim().min(2).max(100),
    source: z.enum(["predictive", "results_page"]),
    resultType: z.enum(["product", "category", "collection", "page"]).optional(),
    resultId: z.string().trim().max(120).optional(),
    href: z.string().trim().max(240).optional(),
  }).optional(),
});

async function createOrderNumber() {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const value = `VL-${new Date().getFullYear()}-${randomInt(100000, 999999)}`;
    const exists = await prisma.order.findUnique({
      where: { orderNumber: value },
      select: { id: true },
    });
    if (!exists) return value;
  }
  return `VL-${Date.now()}`;
}

export async function POST(request: Request) {
  const originError = requireSameOriginRequest(request);
  if (originError) return originError;

  const locale = localeFromRequest(request);
  const parsed = checkoutSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid checkout payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const checkoutSettings = await getCheckoutSettings();
  if (!isPaymentMethodEnabled(checkoutSettings, parsed.data.paymentMethod)) {
    return NextResponse.json(
      {
        code: "PAYMENT_METHOD_UNAVAILABLE",
        error: "Selected payment method is not available right now.",
      },
      { status: 400 },
    );
  }

  const cart = await prisma.cart.findUnique({
    where: { sessionKey: parsed.data.sessionKey },
    include: {
      order: { include: { payment: true } },
      items: {
        include: {
          product: { include: { category: true, collections: true } },
          variant: { include: { color: true, size: true } },
        },
      },
    },
  });
  if (!cart || cart.items.length === 0) {
    return NextResponse.json({ code: "EMPTY_CART", error: "Your cart is empty." }, { status: 400 });
  }
  if (
    cart.order?.paymentStatus.toLowerCase() === "paid" &&
    cart.order.payment?.providerRef
  ) {
    if (cart.order.payment.provider === "paypal" || cart.order.payment.provider === "tabby") {
      return NextResponse.json({
        confirmationUrl: `${localizedPath("/checkout/success", locale)}?order=${encodeURIComponent(cart.order.orderNumber)}&key=${encodeURIComponent(cart.sessionKey)}&payment=${cart.order.payment.provider}`,
        orderNumber: cart.order.orderNumber,
        reused: true,
      });
    }
    return NextResponse.json({
      confirmationUrl: `${localizedPath("/checkout/success", locale)}?session_id=${encodeURIComponent(cart.order.payment.providerRef)}`,
      orderNumber: cart.order.orderNumber,
      reused: true,
    });
  }
  if (cart.order && cart.order.email !== parsed.data.email) {
    return NextResponse.json(
      {
        code: "CHECKOUT_EMAIL_CONFLICT",
        error:
          "Checkout for this cart was already started with another email. Return to cart and refresh before trying again.",
      },
      { status: 409 },
    );
  }
  if (cart.order?.payment?.provider === "cash_on_delivery") {
    return NextResponse.json({
      provider: "cash_on_delivery",
      orderNumber: cart.order.orderNumber,
      confirmationUrl: `${localizedPath("/checkout/success", locale)}?order=${encodeURIComponent(cart.order.orderNumber)}&key=${encodeURIComponent(cart.sessionKey)}&payment=cod`,
      reused: true,
    });
  }
  if (cart.expiresAt.getTime() <= Date.now()) {
    return NextResponse.json(
      {
        code: "RESERVATION_EXPIRED",
        error: "Your inventory reservation expired. Refresh the cart and try again.",
      },
      { status: 409 },
    );
  }

  const subtotal = cart.items.reduce(
    (sum, item) => sum + Number(item.unitPrice) * item.quantity,
    0,
  );
  let coupon:
    | {
        id: string;
        type: string;
        value: number;
        minimumAmount: number;
        eligibleProductIds?: string | null;
        eligibleCategories?: string | null;
        eligibleCollections?: string | null;
        excludedProductIds?: string | null;
      }
    | undefined;
  if (parsed.data.couponCode) {
    const found = await prisma.coupon.findUnique({
      where: { code: parsed.data.couponCode.toUpperCase() },
      include: { _count: { select: { orders: true } } },
    });
    if (
      found &&
      (!found.expiresAt || found.expiresAt.getTime() > Date.now()) &&
      (!found.usageLimit || found._count.orders < found.usageLimit)
    ) {
      coupon = {
        id: found.id,
        type: found.type,
        value: Number(found.value),
        minimumAmount: Number(found.minimumAmount ?? 0),
        eligibleProductIds: found.eligibleProductIds,
        eligibleCategories: found.eligibleCategories,
        eligibleCollections: found.eligibleCollections,
        excludedProductIds: found.excludedProductIds,
      };
    }
  }

  let couponEligible = Boolean(coupon && subtotal >= coupon.minimumAmount);
  let discountTotal = 0;
  if (coupon && couponEligible) {
    const eligibleSubtotal = getCouponEligibleSubtotal(coupon, cart.items.map((item) => ({
      productId: item.productId,
      category: item.product.category.name,
      collections: item.product.collections.map((collection) => collection.slug),
      lineTotal: Number(item.unitPrice) * item.quantity,
    })), subtotal);
    discountTotal =
      coupon.type === "PERCENTAGE"
        ? Math.min(eligibleSubtotal, eligibleSubtotal * (coupon.value / 100))
        : coupon.type === "FIXED"
          ? Math.min(eligibleSubtotal, coupon.value)
          : 0;
    if (eligibleSubtotal <= 0) {
      couponEligible = false;
      discountTotal = 0;
    }
  }
  const shippingQuote = getShippingQuote(checkoutSettings, {
    emirate: parsed.data.emirate,
    methodId: parsed.data.shippingMethod,
    subtotal,
    freeShipping: coupon?.type === "FREE_SHIPPING",
  });
  if (!shippingQuote) {
    return NextResponse.json(
      {
        code: "SHIPPING_METHOD_UNAVAILABLE",
        error: "Selected shipping method is not available for this emirate.",
      },
      { status: 400 },
    );
  }
  const shippingTotal = shippingQuote.total;
  const preGiftCardTotal = Math.max(0, subtotal - discountTotal) + shippingTotal;
  let giftCardTotal = 0;
  if (parsed.data.giftCardCode) {
    const quote = await getGiftCardQuote(parsed.data.giftCardCode, preGiftCardTotal);
    if (!quote.valid) {
      return NextResponse.json(
        { code: "GIFT_CARD_INVALID", error: quote.reason },
        { status: 400 },
      );
    }
    giftCardTotal = quote.appliedAmount;
  }
  const total = Math.max(0, preGiftCardTotal - giftCardTotal);
  let order = cart.order;
  if (!order) {
    const orderNumber = await createOrderNumber();
    const matchingUser = await prisma.user.findUnique({
      where: { email: parsed.data.email },
      select: { id: true },
    });
    try {
      order = await prisma.$transaction(async (tx) => {
        const address = await tx.address.create({
          data: {
            userId: matchingUser?.id,
            name: `${parsed.data.firstName} ${parsed.data.lastName}`,
            phone: parsed.data.phone,
            line1: parsed.data.address,
            line2: parsed.data.addressLine2,
            city: parsed.data.city,
            country: "United Arab Emirates",
          },
        });
        const created = await tx.order.create({
          data: {
            orderNumber,
            userId: matchingUser?.id,
            email: parsed.data.email,
            locale,
            status: "PENDING",
            paymentStatus: "pending",
            fulfillmentStatus: "unfulfilled",
            customerNote: parsed.data.customerNote,
            subtotal,
            shippingTotal,
            discountTotal,
            giftCardTotal,
            total,
            shippingAddressId: address.id,
            billingAddressId: address.id,
            couponId: couponEligible && coupon ? coupon.id : undefined,
            cartId: cart.id,
            items: {
              create: cart.items.map((item) => ({
                productId: item.productId,
                variantId: item.variantId,
                title: item.product.title,
                size: item.size,
                color: item.color,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
              })),
            },
            payment: {
              create: {
                provider: parsed.data.paymentMethod,
                status:
                  parsed.data.paymentMethod === "cash_on_delivery"
                    ? "cod_pending"
                    : "pending",
                amount: total,
              },
            },
          },
          include: { payment: true },
        });
        if (parsed.data.giftCardCode && giftCardTotal > 0) {
          const held = await holdGiftCardForOrder({
            tx,
            code: parsed.data.giftCardCode,
            orderId: created.id,
            amount: preGiftCardTotal,
            actor: "Checkout",
          });
          if (held && held.amount !== giftCardTotal) {
            await tx.order.update({
              where: { id: created.id },
              data: {
                giftCardTotal: held.amount,
                total: Math.max(0, preGiftCardTotal - held.amount),
                payment: { update: { amount: Math.max(0, preGiftCardTotal - held.amount) } },
              },
            });
            created.giftCardTotal = new Prisma.Decimal(held.amount);
            created.total = new Prisma.Decimal(Math.max(0, preGiftCardTotal - held.amount));
          }
        }
        await tx.cart.update({
          where: { id: cart.id },
          data: {
            email: parsed.data.email,
            status: CartStatus.CHECKOUT,
            checkoutStartedAt: new Date(),
            expiresAt: new Date(Date.now() + 60 * 60_000),
          },
        });
        if (matchingUser) {
          await tx.user.update({
            where: { id: matchingUser.id },
            data: { preferredLocale: locale },
          });
        }
        return created;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        order = await prisma.order.findUnique({
          where: { cartId: cart.id },
          include: { payment: true },
        });
      } else {
        throw error;
      }
    }
  }
  if (!order) {
    return NextResponse.json(
      { code: "ORDER_PREPARE_FAILED", error: "Unable to prepare your order." },
      { status: 500 },
    );
  }

  if (order.payment?.provider !== parsed.data.paymentMethod) {
    const payment = order.payment
      ? await prisma.payment.update({
          where: { orderId: order.id },
          data: {
            provider: parsed.data.paymentMethod,
            providerRef: null,
            status: parsed.data.paymentMethod === "cash_on_delivery" ? "cod_pending" : "pending",
            amount: order.total,
          },
        })
      : await prisma.payment.create({
          data: {
            orderId: order.id,
            provider: parsed.data.paymentMethod,
            status: parsed.data.paymentMethod === "cash_on_delivery" ? "cod_pending" : "pending",
            amount: order.total,
          },
        });
    order = { ...order, payment };
  }

  await recordSearchConversionEvent({
    attribution: parsed.data.searchAttribution,
    orderId: order.id,
    conversionValue: Number(order.total),
  });

  if (Number(order.total) <= 0) {
    await prisma.payment.update({
      where: { orderId: order.id },
      data: { provider: "gift_card", providerRef: null, status: "paid", amount: 0 },
    });
    await completeCartOrder(order.id, "gift_card");
    await attributeProductAlertConversions({
      email: parsed.data.email,
      productIds: cart.items.map((item) => item.productId),
    });
    await attributeAutomationConversions({
      email: parsed.data.email,
      orderId: order.id,
      orderTotal: Number(order.total),
    });
    return NextResponse.json({
      provider: "gift_card",
      orderNumber: order.orderNumber,
      confirmationUrl: `${localizedPath("/checkout/success", locale)}?order=${encodeURIComponent(order.orderNumber)}&key=${encodeURIComponent(cart.sessionKey)}`,
    });
  }

  if (parsed.data.paymentMethod === "cash_on_delivery") {
    await completeCashOnDeliveryOrder(order.id);
    await attributeProductAlertConversions({
      email: parsed.data.email,
      productIds: cart.items.map((item) => item.productId),
    });
    await attributeAutomationConversions({
      email: parsed.data.email,
      orderId: order.id,
      orderTotal: Number(order.total),
    });
    return NextResponse.json({
      provider: "cash_on_delivery",
      orderNumber: order.orderNumber,
      confirmationUrl: `${localizedPath("/checkout/success", locale)}?order=${encodeURIComponent(order.orderNumber)}&key=${encodeURIComponent(cart.sessionKey)}&payment=cod`,
    });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  if (parsed.data.paymentMethod === "paypal") {
    if (!isPayPalConfigured()) {
      return NextResponse.json(
        {
          code: "PAYPAL_NOT_CONFIGURED",
          error: "PayPal checkout is not configured right now.",
        },
        { status: 503 },
      );
    }
    const paypalOrder = await createPayPalOrder({
      orderId: order.id,
      orderNumber: order.orderNumber,
      amount: Number(order.total),
      currency: "AED",
      returnUrl: `${siteUrl}${localizedPath("/checkout/success", locale)}?order=${encodeURIComponent(order.orderNumber)}&key=${encodeURIComponent(cart.sessionKey)}&payment=paypal`,
      cancelUrl: `${siteUrl}${localizedPath("/checkout", locale)}?cancelled=1`,
    });
    await prisma.payment.update({
      where: { orderId: order.id },
      data: { provider: "paypal", providerRef: paypalOrder.id, status: "pending" },
    });
    return NextResponse.json({
      provider: "paypal",
      url: paypalOrder.approvalUrl,
      orderNumber: order.orderNumber,
    });
  }

  if (parsed.data.paymentMethod === "tabby") {
    if (!isTabbyConfigured()) {
      return NextResponse.json(
        {
          code: "TABBY_NOT_CONFIGURED",
          error: "Tabby checkout is not configured right now.",
        },
        { status: 503 },
      );
    }
    const successUrl = `${siteUrl}${localizedPath("/checkout/success", locale)}?order=${encodeURIComponent(order.orderNumber)}&key=${encodeURIComponent(cart.sessionKey)}&payment=tabby`;
    const tabbySession = await createTabbyCheckoutSession({
      orderId: order.id,
      orderNumber: order.orderNumber,
      amount: Number(order.total),
      currency: "AED",
      buyer: {
        email: parsed.data.email,
        phone: parsed.data.phone,
        name: `${parsed.data.firstName} ${parsed.data.lastName}`,
      },
      shippingAddress: {
        city: parsed.data.city,
        address: [parsed.data.address, parsed.data.addressLine2].filter(Boolean).join(", "),
        phone: parsed.data.phone,
      },
      items: cart.items.map((item) => ({
        title: item.product.title,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        referenceId: item.variantId,
        category: item.product.categoryId ?? "Fashion",
      })),
      successUrl,
      cancelUrl: `${siteUrl}${localizedPath("/checkout", locale)}?cancelled=1`,
      failureUrl: `${siteUrl}${localizedPath("/checkout", locale)}?cancelled=1`,
    });
    await prisma.payment.update({
      where: { orderId: order.id },
      data: { provider: "tabby", providerRef: tabbySession.paymentId, status: "pending" },
    });
    return NextResponse.json({
      provider: "tabby",
      url: tabbySession.checkoutUrl,
      orderNumber: order.orderNumber,
    });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({
      provider: "stripe",
      mode: "stub",
      orderNumber: order.orderNumber,
      confirmationUrl: `${localizedPath("/checkout/success", locale)}?order=${encodeURIComponent(order.orderNumber)}&key=${encodeURIComponent(cart.sessionKey)}`,
    });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  if (order.payment?.providerRef) {
    try {
      const existingSession = await stripe.checkout.sessions.retrieve(
        order.payment.providerRef,
      );
      if (existingSession.status === "open" && existingSession.url) {
        return NextResponse.json({
          url: existingSession.url,
          orderNumber: order.orderNumber,
          reused: true,
        });
      }
      if (existingSession.status === "complete") {
        return NextResponse.json({
          confirmationUrl: `${localizedPath("/checkout/success", locale)}?session_id=${encodeURIComponent(existingSession.id)}`,
          orderNumber: order.orderNumber,
          reused: true,
        });
      }
    } catch {
      // A missing or expired provider session is replaced below.
    }
  }
  const stripeDiscount =
    discountTotal > 0
      ? await stripe.coupons.create({
          amount_off: Math.round(discountTotal * 100),
          currency: "aed",
          duration: "once",
          name: parsed.data.couponCode
            ? `Velora ${parsed.data.couponCode.toUpperCase()}`
            : "Velora discount",
        })
      : undefined;
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: parsed.data.email,
    currency: "aed",
    success_url: `${siteUrl}${localizedPath("/checkout/success", locale)}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}${localizedPath("/checkout", locale)}?cancelled=1`,
    metadata: { orderId: order.id, cartId: cart.id },
    discounts: stripeDiscount ? [{ coupon: stripeDiscount.id }] : undefined,
    shipping_options:
      shippingTotal > 0
        ? [
            {
              shipping_rate_data: {
                type: "fixed_amount",
                fixed_amount: {
                  amount: Math.round(shippingTotal * 100),
                  currency: "aed",
                },
                display_name:
                  shippingQuote.label,
              },
            },
          ]
        : undefined,
    line_items: cart.items.map((item) => ({
      quantity: item.quantity,
      price_data: {
        currency: "aed",
        product_data: {
          name: item.product.title,
          description: `${item.color} / ${item.size}`,
        },
        unit_amount: Math.round(Number(item.unitPrice) * 100),
      },
    })),
  }, {
    idempotencyKey: order.payment?.providerRef
      ? `checkout-retry:${order.id}:${order.payment.providerRef}`
      : `checkout:${order.id}`,
  });

  await prisma.payment.update({
    where: { orderId: order.id },
    data: { providerRef: session.id },
  });
  return NextResponse.json({ url: session.url, orderNumber: order.orderNumber });
}
