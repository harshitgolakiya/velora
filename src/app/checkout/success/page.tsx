import type { Metadata } from "next";
import Link from "next/link";
import {
  CheckCircle2,
  Clock3,
  Package,
  Truck,
  Bell,
  Star,
  HeadphonesIcon,
  ArrowRight,
  MapPin,
} from "lucide-react";
import Stripe from "stripe";
import { CheckoutConfirmationClient } from "@/components/store/checkout-confirmation-client";
import { completeCartOrder } from "@/lib/cart-reservations";
import { capturePayPalOrder, isPayPalConfigured } from "@/lib/paypal";
import { prisma } from "@/lib/prisma";
import { captureTabbyPayment, isTabbyConfigured, retrieveTabbyPayment } from "@/lib/tabby";
import { formatAed } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Order Confirmed",
  robots: { index: false, follow: false },
};

async function resolveOrder(params: {
  session_id?: string;
  order?: string;
  key?: string;
  payment?: string;
  token?: string;
}) {
  let orderId: string | undefined;

  if (params.session_id && process.env.STRIPE_SECRET_KEY) {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.retrieve(params.session_id);
    orderId = session.metadata?.orderId;
    if (orderId && session.payment_status === "paid") {
      await completeCartOrder(orderId, session.id);
    }
  } else if (
    params.payment === "paypal" &&
    params.order &&
    params.key &&
    params.token &&
    isPayPalConfigured()
  ) {
    const stubOrder = await prisma.order.findFirst({
      where: {
        orderNumber: params.order,
        cart: { sessionKey: params.key },
        payment: { is: { provider: "paypal", providerRef: params.token } },
      },
      select: { id: true, paymentStatus: true },
    });
    orderId = stubOrder?.id;
    if (stubOrder && stubOrder.paymentStatus.toLowerCase() !== "paid") {
      const capture = await capturePayPalOrder(params.token);
      if (capture.status === "COMPLETED" || capture.captureStatus === "COMPLETED") {
        await completeCartOrder(stubOrder.id, params.token);
      }
    }
  } else if (
    params.payment === "tabby" &&
    params.order &&
    params.key &&
    isTabbyConfigured()
  ) {
    const stubOrder = await prisma.order.findFirst({
      where: {
        orderNumber: params.order,
        cart: { sessionKey: params.key },
        payment: { is: { provider: "tabby", providerRef: { not: null } } },
      },
      include: { items: true, payment: true },
    });
    orderId = stubOrder?.id;
    if (stubOrder?.payment?.providerRef && stubOrder.paymentStatus.toLowerCase() !== "paid") {
      const payment = await retrieveTabbyPayment(stubOrder.payment.providerRef);
      if (payment.status === "AUTHORIZED") {
        const capture = await captureTabbyPayment({
          paymentId: stubOrder.payment.providerRef,
          amount: Number(stubOrder.total),
          currency: "AED",
          items: stubOrder.items.map((item) => ({
            title: item.title,
            quantity: item.quantity,
            unitPrice: Number(item.unitPrice),
            referenceId: item.variantId ?? item.id,
            category: "Fashion",
          })),
        });
        if (capture.status === "CLOSED") {
          await completeCartOrder(stubOrder.id, stubOrder.payment.providerRef);
        }
      } else if (payment.status === "CLOSED") {
        await completeCartOrder(stubOrder.id, stubOrder.payment.providerRef);
      }
    }
  } else if (
    params.order &&
    params.key &&
    (!process.env.STRIPE_SECRET_KEY || params.payment === "cod" || params.payment === "paypal" || params.payment === "tabby")
  ) {
    const stubOrder = await prisma.order.findFirst({
      where: {
        orderNumber: params.order,
        cart: { sessionKey: params.key },
      },
      select: { id: true },
    });
    orderId = stubOrder?.id;
  }

  if (!orderId) return null;
  return prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
      payment: true,
      shippingAddress: true,
      shipment: true,
    },
  });
}

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{
    session_id?: string;
    order?: string;
    key?: string;
    payment?: string;
    token?: string;
  }>;
}) {
  const params = await searchParams;
  let order = null;
  try {
    order = await resolveOrder(params);
  } catch {
    order = null;
  }

  // ── Not found state ─────────────────────────────────────────────────────────
  if (!order) {
    return (
      <section className="storefront-container-compact py-24 text-center">
        <div className="storefront-action mx-auto grid size-16 place-items-center border border-[var(--border)]">
          <Clock3 className="size-7 text-[var(--accent-text)]" />
        </div>
        <h1 className="display-md mt-6">
          Order not verified yet
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-[var(--muted)]">
          The confirmation link may be incomplete, or the payment provider may still
          be processing. This usually resolves within a minute.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/track-order"
            className="btn btn-secondary"
          >
            Track an order
          </Link>
          <Link
            href="/contact"
            className="btn btn-primary"
          >
            Contact support
          </Link>
        </div>
      </section>
    );
  }

  const paid = order.paymentStatus.toLowerCase() === "paid";
  const cashOnDelivery = order.payment?.provider === "cash_on_delivery";
  const isConfirmed = paid || cashOnDelivery || !process.env.STRIPE_SECRET_KEY;

  // ── What happens next steps ─────────────────────────────────────────────────
  const nextSteps = cashOnDelivery
    ? [
        {
          icon: <Bell className="size-5" />,
          title: "Confirmation email sent",
          desc: `A summary of your order has been sent to ${order.email}.`,
        },
        {
          icon: <Package className="size-5" />,
          title: "Order is being prepared",
          desc: "Our team will pick and pack your items within 1 business day.",
        },
        {
          icon: <Truck className="size-5" />,
          title: "Delivery to your door",
          desc: "Standard delivery timing is confirmed at checkout. Have cash ready on arrival.",
        },
        {
          icon: <Star className="size-5" />,
          title: "Share your feedback",
          desc: "After delivery, we'd love to hear what you think about your order.",
        },
      ]
    : [
        {
          icon: <Bell className="size-5" />,
          title: "Confirmation email sent",
          desc: `A receipt and order summary have been sent to ${order.email}.`,
        },
        {
          icon: <Package className="size-5" />,
          title: "Order is being prepared",
          desc: "Our team will pick and pack your items within 1 business day.",
        },
        {
          icon: <Truck className="size-5" />,
          title: "Shipped with tracking",
          desc: "You'll receive a tracking number by email as soon as your parcel ships.",
        },
        {
          icon: <Star className="size-5" />,
          title: "Share your feedback",
          desc: "After delivery, leave a review and help others discover Velora.",
        },
      ];

  return (
    <>
      <CheckoutConfirmationClient clearCart={isConfirmed} />
      <div className="storefront-container-compact py-10 sm:py-16">
        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <div className="text-center">
          <div className={`storefront-action mx-auto grid size-20 place-items-center border-2 ${
            isConfirmed ? "border-emerald-500/40 bg-emerald-500/8" : "border-[var(--border)]"
          }`}>
            {isConfirmed ? (
              <CheckCircle2 className="size-10 text-emerald-500" />
            ) : (
              <Clock3 className="size-10 text-[var(--accent-text)]" />
            )}
          </div>
          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-text)]">
            Order {order.orderNumber}
          </p>
          <h1 className="display-lg mt-2">
            {paid
              ? "Payment confirmed!"
              : cashOnDelivery
                ? "Order placed - pay on delivery"
                : "Order received"}
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[var(--muted)]">
            {paid
              ? `Thank you for your order. A confirmation has been sent to ${order.email}.`
              : cashOnDelivery
                ? `We'll collect ${formatAed(Number(order.total))} in cash when your order arrives. Confirmation sent to ${order.email}.`
                : "Payment is not configured in this environment. The order was created for checkout testing."}
          </p>
        </div>

        {/* ── What happens next ─────────────────────────────────────────── */}
        <div className="mt-12">
          <h2 className="mb-5 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
            What happens next
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {nextSteps.map((step, i) => (
              <div
                key={i}
                className="card flex gap-4 p-5"
              >
                <div className="storefront-action mt-0.5 grid size-9 shrink-0 place-items-center bg-[var(--card)] text-[var(--accent-text)]">
                  {step.icon}
                </div>
                <div>
                  <p className="text-sm font-semibold">{step.title}</p>
                  <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Order summary ────────────────────────────────────────────── */}
        <div className="card mt-8">
          <div className="flex items-center gap-3 border-b border-[var(--border)] px-5 py-4">
            <Package className="size-5 text-[var(--accent-text)]" />
            <div>
              <p className="text-sm font-semibold">Order summary</p>
              <p className="text-xs text-[var(--muted)]">
                {order.items.reduce((sum, item) => sum + item.quantity, 0)} items
              </p>
            </div>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between gap-5 px-5 py-4 text-sm">
                <div>
                  <p className="font-medium">{item.title} × {item.quantity}</p>
                  <p className="mt-0.5 text-xs text-[var(--muted)]">
                    {item.color} / {item.size}
                  </p>
                </div>
                <span className="shrink-0 font-medium">
                  {formatAed(Number(item.unitPrice) * item.quantity)}
                </span>
              </div>
            ))}
          </div>
          <div className="space-y-2 border-t border-[var(--border)] px-5 py-4 text-sm">
            <div className="flex justify-between text-[var(--muted)]">
              <span>Subtotal</span>
              <span className="text-[var(--foreground)]">{formatAed(Number(order.subtotal))}</span>
            </div>
            {Number(order.discountTotal) > 0 ? (
              <div className="flex justify-between text-[var(--accent-text)]">
                <span>Discount</span>
                <span>-{formatAed(Number(order.discountTotal))}</span>
              </div>
            ) : null}
            {Number(order.giftCardTotal) > 0 ? (
              <div className="flex justify-between text-[var(--accent-text)]">
                <span>Gift card</span>
                <span>-{formatAed(Number(order.giftCardTotal))}</span>
              </div>
            ) : null}
            <div className="flex justify-between text-[var(--muted)]">
              <span>Shipping</span>
              <span className="text-[var(--foreground)]">
                {Number(order.shippingTotal) === 0 ? "Free" : formatAed(Number(order.shippingTotal))}
              </span>
            </div>
            <div className="flex justify-between border-t border-[var(--border)] pt-3 text-base font-semibold">
              <span>Total</span>
              <span>{formatAed(Number(order.total))}</span>
            </div>
          </div>
        </div>

        {/* ── Delivery address ─────────────────────────────────────────── */}
        {order.shippingAddress ? (
          <div className="card mt-4 flex gap-4 px-5 py-4">
            <MapPin className="mt-0.5 size-5 shrink-0 text-[var(--accent-text)]" />
            <div className="text-sm">
              <p className="font-semibold">Delivery address</p>
              <p className="mt-1.5 leading-6 text-[var(--muted)]">
                {order.shippingAddress.name}<br />
                {order.shippingAddress.line1}
                {order.shippingAddress.line2 ? <><br />{order.shippingAddress.line2}</> : null}<br />
                {order.shippingAddress.city}, {order.shippingAddress.country ?? "United Arab Emirates"}<br />
                {order.shippingAddress.phone}
              </p>
            </div>
          </div>
        ) : null}

        {/* ── Shipment tracking ─────────────────────────────────────────── */}
        {order.shipment?.trackingNo ? (
          <div className="card mt-4 flex items-center justify-between gap-4 px-5 py-4">
            <div className="flex gap-3">
              <Truck className="mt-0.5 size-5 shrink-0 text-[var(--accent-text)]" />
              <div>
                <p className="text-sm font-semibold">Tracking number</p>
                <p className="mt-0.5 font-mono text-xs text-[var(--muted)]">
                  {order.shipment.trackingNo}
                </p>
              </div>
            </div>
            <Link
              href="/track-order"
              className="flex shrink-0 items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.1em] underline underline-offset-2"
            >
              Track <ArrowRight className="size-3.5" />
            </Link>
          </div>
        ) : null}

        {/* ── Support strip ────────────────────────────────────────────── */}
        <div className="card mt-8 p-5">
          <div className="flex items-center gap-3">
            <HeadphonesIcon className="size-5 shrink-0 text-[var(--accent-text)]" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Need help with your order?</p>
              <p className="mt-0.5 text-xs text-[var(--muted)]">
                Our team is available 9 am-9 pm Gulf time, 7 days a week.
              </p>
            </div>
            <Link
              href="/contact"
              className="storefront-action shrink-0 border border-[var(--border)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] transition hover:bg-[var(--hover)] motion-reduce:transition-none"
            >
              Contact us
            </Link>
          </div>
        </div>

        {/* ── CTAs ─────────────────────────────────────────────────────── */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/track-order"
            className="btn btn-secondary"
          >
            <Truck className="size-4" />
            Track order
          </Link>
          <Link
            href="/shop"
            className="btn btn-primary"
          >
            Continue shopping
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </>
  );
}
