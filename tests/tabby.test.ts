import { afterEach, describe, expect, it, vi } from "vitest";
import {
  captureTabbyPayment,
  createTabbyCheckoutSession,
  isTabbyConfigured,
  retrieveTabbyPayment,
} from "@/lib/tabby";

const originalFetch = global.fetch;
const originalEnv = {
  TABBY_API_BASE: process.env.TABBY_API_BASE,
  TABBY_MERCHANT_CODE: process.env.TABBY_MERCHANT_CODE,
  TABBY_SECRET_KEY: process.env.TABBY_SECRET_KEY,
};

afterEach(() => {
  global.fetch = originalFetch;
  vi.restoreAllMocks();
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

function configureTabby() {
  process.env.TABBY_API_BASE = "https://tabby.test";
  process.env.TABBY_MERCHANT_CODE = "velora";
  process.env.TABBY_SECRET_KEY = "secret";
}

describe("Tabby adapter", () => {
  it("reports whether credentials are configured", () => {
    delete process.env.TABBY_SECRET_KEY;
    expect(isTabbyConfigured()).toBe(false);

    configureTabby();
    expect(isTabbyConfigured()).toBe(true);
  });

  it("creates a checkout session and returns the hosted URL", async () => {
    configureTabby();
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({
      id: "session-1",
      status: "created",
      payment: { id: "payment-1", status: "CREATED" },
      configuration: {
        available_products: {
          installments: [{ web_url: "https://tabby.test/checkout/session-1" }],
        },
      },
    }), { status: 200 }));
    global.fetch = fetchMock;

    await expect(createTabbyCheckoutSession({
      orderId: "order-1",
      orderNumber: "VL-100",
      amount: 250,
      buyer: { email: "shopper@example.com", phone: "+971501234567", name: "Test Shopper" },
      shippingAddress: { city: "Dubai", address: "Downtown Dubai", phone: "+971501234567" },
      items: [{ title: "Dress", quantity: 1, unitPrice: 250, referenceId: "variant-1" }],
      successUrl: "https://velora.test/success",
      cancelUrl: "https://velora.test/cancel",
      failureUrl: "https://velora.test/failure",
    })).resolves.toEqual({
      id: "session-1",
      status: "created",
      paymentId: "payment-1",
      paymentStatus: "CREATED",
      checkoutUrl: "https://tabby.test/checkout/session-1",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://tabby.test/api/v2/checkout",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer secret" }),
      }),
    );
  });

  it("retrieves and captures payments", async () => {
    configureTabby();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "payment-1", status: "AUTHORIZED" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "payment-1", status: "CLOSED" }), { status: 200 }));
    global.fetch = fetchMock;

    await expect(retrieveTabbyPayment("payment-1")).resolves.toEqual({
      id: "payment-1",
      status: "AUTHORIZED",
    });
    await expect(captureTabbyPayment({
      paymentId: "payment-1",
      amount: 250,
      items: [{ title: "Dress", quantity: 1, unitPrice: 250, referenceId: "variant-1" }],
    })).resolves.toEqual({
      id: "payment-1",
      status: "CLOSED",
    });
  });
});
