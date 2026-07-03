import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cartFindUnique: vi.fn(),
  couponFindUnique: vi.fn(),
  getCheckoutSettings: vi.fn(),
  getGiftCardQuote: vi.fn(),
  holdGiftCardForOrder: vi.fn(),
  isPaymentMethodEnabled: vi.fn(),
  orderFindUnique: vi.fn(),
  paymentCreate: vi.fn(),
  paymentUpdate: vi.fn(),
  prismaTransaction: vi.fn(),
  userFindUnique: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    cart: { findUnique: mocks.cartFindUnique },
    coupon: { findUnique: mocks.couponFindUnique },
    order: { findUnique: mocks.orderFindUnique },
    payment: { create: mocks.paymentCreate, update: mocks.paymentUpdate },
    user: { findUnique: mocks.userFindUnique },
    $transaction: mocks.prismaTransaction,
  },
}));

vi.mock("@/lib/store-settings", () => ({
  getCheckoutSettings: mocks.getCheckoutSettings,
}));

vi.mock("@/lib/payment-method-settings", () => ({
  isPaymentMethodEnabled: mocks.isPaymentMethodEnabled,
}));

vi.mock("@/lib/transactional-email", () => ({
  localeFromRequest: () => "en",
}));

vi.mock("@/lib/i18n", () => ({
  localizedPath: (path: string) => path,
}));

vi.mock("@/lib/cart-reservations", () => ({
  completeCartOrder: vi.fn(),
  completeCashOnDeliveryOrder: vi.fn(),
}));

vi.mock("@/lib/gift-cards", () => ({
  getGiftCardQuote: mocks.getGiftCardQuote,
  holdGiftCardForOrder: mocks.holdGiftCardForOrder,
}));

vi.mock("@/lib/product-alert-queue", () => ({
  attributeProductAlertConversions: vi.fn(),
}));

vi.mock("@/lib/email-delivery", () => ({
  attributeAutomationConversions: vi.fn(),
}));

vi.mock("@/lib/search-analytics", () => ({
  recordSearchConversionEvent: vi.fn(),
}));

vi.mock("@/lib/shipping-settings", () => ({
  getShippingQuote: vi.fn(() => ({ id: "standard", label: "Standard", total: 25 })),
}));

function checkoutPayload(overrides: Record<string, unknown> = {}) {
  return {
    sessionKey: "checkout-session-123",
    email: "customer@example.com",
    firstName: "Test",
    lastName: "Customer",
    phone: "+971501234567",
    address: "Downtown Dubai Building 1",
    city: "Dubai",
    emirate: "Dubai",
    shippingMethod: "standard",
    paymentMethod: "stripe",
    ...overrides,
  };
}

function cart(overrides: Record<string, unknown> = {}) {
  return {
    id: "cart_1",
    sessionKey: "checkout-session-123",
    email: "customer@example.com",
    expiresAt: new Date(Date.now() + 60_000),
    order: null,
    items: [{ id: "item_1" }],
    ...overrides,
  };
}

async function postCheckout(payload = checkoutPayload()) {
  const { POST } = await import("@/app/api/checkout/route");
  return POST(new Request("https://velora.test/api/checkout", {
    method: "POST",
    body: JSON.stringify(payload),
  }));
}

type CheckoutOrderCreateData = {
  subtotal: number;
  shippingTotal: number;
  discountTotal: number;
  giftCardTotal: number;
  total: number;
  couponId: string;
  cartId: string;
  payment: {
    create: {
      provider: string;
      status: string;
      amount: number;
    };
  };
  items: {
    create: Array<Record<string, unknown>>;
  };
};

type CartUpdateData = {
  email: string;
  status: string;
};

describe("checkout route payment flow guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.STRIPE_SECRET_KEY;
    mocks.couponFindUnique.mockResolvedValue(null);
    mocks.getCheckoutSettings.mockResolvedValue({});
    mocks.getGiftCardQuote.mockResolvedValue({ valid: false, reason: "Invalid gift card" });
    mocks.holdGiftCardForOrder.mockResolvedValue(null);
    mocks.isPaymentMethodEnabled.mockReturnValue(true);
    mocks.orderFindUnique.mockResolvedValue(null);
    mocks.paymentCreate.mockResolvedValue(null);
    mocks.paymentUpdate.mockResolvedValue(null);
    mocks.userFindUnique.mockResolvedValue(null);
  });

  it("rejects unavailable payment methods before cart mutation", async () => {
    mocks.isPaymentMethodEnabled.mockReturnValue(false);

    const response = await postCheckout();
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.code).toBe("PAYMENT_METHOD_UNAVAILABLE");
    expect(mocks.cartFindUnique).not.toHaveBeenCalled();
  });

  it("reuses a completed Stripe checkout instead of creating a duplicate order", async () => {
    mocks.cartFindUnique.mockResolvedValue(cart({
      order: {
        id: "order_1",
        orderNumber: "VL-100",
        email: "customer@example.com",
        paymentStatus: "paid",
        payment: { provider: "stripe", providerRef: "cs_paid_1" },
      },
    }));

    const response = await postCheckout();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      reused: true,
      orderNumber: "VL-100",
      confirmationUrl: "/checkout/success?session_id=cs_paid_1",
    });
  });

  it("reuses an existing cash-on-delivery checkout after cancellation or retry", async () => {
    mocks.cartFindUnique.mockResolvedValue(cart({
      order: {
        id: "order_1",
        orderNumber: "VL-101",
        email: "customer@example.com",
        paymentStatus: "cod_pending",
        payment: { provider: "cash_on_delivery", providerRef: null },
      },
    }));

    const response = await postCheckout(checkoutPayload({ paymentMethod: "cash_on_delivery" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      provider: "cash_on_delivery",
      reused: true,
      confirmationUrl: "/checkout/success?order=VL-101&key=checkout-session-123&payment=cod",
    });
  });

  it("fails expired reservations before payment provider setup", async () => {
    mocks.cartFindUnique.mockResolvedValue(cart({
      expiresAt: new Date(Date.now() - 60_000),
    }));

    const response = await postCheckout();
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.code).toBe("RESERVATION_EXPIRED");
  });

  it("reconciles coupon, gift-card, shipping, and payment totals when creating an order", async () => {
    let createdOrderData: CheckoutOrderCreateData | undefined;
    let cartUpdateData: CartUpdateData | undefined;

    mocks.cartFindUnique.mockResolvedValue(cart({
      items: [
        {
          id: "item_1",
          productId: "product_1",
          variantId: "variant_1",
          size: "M",
          color: "Black",
          unitPrice: 100,
          quantity: 2,
          product: {
            title: "Target Legging",
            categoryId: "cat_1",
            category: { name: "Leggings" },
            collections: [{ slug: "studio" }],
          },
        },
      ],
    }));
    mocks.couponFindUnique.mockResolvedValue({
      id: "coupon_1",
      code: "LEGGINGS10",
      type: "PERCENTAGE",
      value: 10,
      minimumAmount: 0,
      usageLimit: null,
      expiresAt: null,
      eligibleProductIds: null,
      eligibleCategories: JSON.stringify(["Leggings"]),
      eligibleCollections: null,
      excludedProductIds: null,
      _count: { orders: 0 },
    });
    mocks.getGiftCardQuote.mockResolvedValue({
      valid: true,
      giftCardId: "gift_1",
      codeLast4: "ABCD",
      balance: 75,
      appliedAmount: 50,
    });
    mocks.holdGiftCardForOrder.mockResolvedValue({ giftCardId: "gift_1", amount: 50 });
    mocks.prismaTransaction.mockImplementation(async (callback) => callback({
      address: {
        create: vi.fn().mockResolvedValue({ id: "address_1" }),
      },
      cart: {
        update: vi.fn(async ({ data }) => {
          cartUpdateData = data;
          return {};
        }),
      },
      order: {
        create: vi.fn(async ({ data }) => {
          createdOrderData = data;
          return {
            id: "order_1",
            orderNumber: "VL-200",
            email: "customer@example.com",
            total: data.total,
            giftCardTotal: data.giftCardTotal,
            payment: { provider: "stripe", providerRef: null, status: "pending" },
          };
        }),
      },
      user: {
        update: vi.fn(),
      },
    }));

    const response = await postCheckout(checkoutPayload({
      couponCode: "leggings10",
      giftCardCode: "GIFT-ABCD",
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      provider: "stripe",
      mode: "stub",
      orderNumber: "VL-200",
      confirmationUrl: "/checkout/success?order=VL-200&key=checkout-session-123",
    });
    expect(mocks.couponFindUnique).toHaveBeenCalledWith({
      where: { code: "LEGGINGS10" },
      include: { _count: { select: { orders: true } } },
    });
    expect(mocks.getGiftCardQuote).toHaveBeenCalledWith("GIFT-ABCD", 205);
    expect(mocks.holdGiftCardForOrder).toHaveBeenCalledWith(expect.objectContaining({
      code: "GIFT-ABCD",
      orderId: "order_1",
      amount: 205,
      actor: "Checkout",
    }));
    expect(createdOrderData).toMatchObject({
      subtotal: 200,
      shippingTotal: 25,
      discountTotal: 20,
      giftCardTotal: 50,
      total: 155,
      couponId: "coupon_1",
      cartId: "cart_1",
      payment: {
        create: {
          provider: "stripe",
          status: "pending",
          amount: 155,
        },
      },
    });
    expect(createdOrderData?.items.create).toEqual([
      expect.objectContaining({
        productId: "product_1",
        variantId: "variant_1",
        quantity: 2,
        unitPrice: 100,
      }),
    ]);
    expect(cartUpdateData).toMatchObject({
      email: "customer@example.com",
      status: "CHECKOUT",
    });
  });
});
