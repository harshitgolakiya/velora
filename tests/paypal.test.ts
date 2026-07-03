import { afterEach, describe, expect, it, vi } from "vitest";
import { capturePayPalOrder, createPayPalOrder, isPayPalConfigured } from "@/lib/paypal";

const originalFetch = global.fetch;
const originalEnv = {
  PAYPAL_API_BASE: process.env.PAYPAL_API_BASE,
  PAYPAL_CLIENT_ID: process.env.PAYPAL_CLIENT_ID,
  PAYPAL_CLIENT_SECRET: process.env.PAYPAL_CLIENT_SECRET,
  PAYPAL_ENVIRONMENT: process.env.PAYPAL_ENVIRONMENT,
};

afterEach(() => {
  global.fetch = originalFetch;
  vi.restoreAllMocks();
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

function configurePayPal() {
  process.env.PAYPAL_API_BASE = "https://paypal.test";
  process.env.PAYPAL_CLIENT_ID = "client";
  process.env.PAYPAL_CLIENT_SECRET = "secret";
}

describe("PayPal adapter", () => {
  it("reports whether credentials are configured", () => {
    delete process.env.PAYPAL_CLIENT_ID;
    delete process.env.PAYPAL_CLIENT_SECRET;
    expect(isPayPalConfigured()).toBe(false);

    configurePayPal();
    expect(isPayPalConfigured()).toBe(true);
  });

  it("creates an order and returns the approval URL", async () => {
    configurePayPal();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "token" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        id: "PAYPAL-ORDER-1",
        status: "CREATED",
        links: [{ rel: "approve", href: "https://paypal.test/approve" }],
      }), { status: 201 }));
    global.fetch = fetchMock;

    await expect(createPayPalOrder({
      orderId: "order-1",
      orderNumber: "VL-100",
      amount: 125,
      returnUrl: "https://velora.test/checkout/success",
      cancelUrl: "https://velora.test/checkout",
    })).resolves.toEqual({
      id: "PAYPAL-ORDER-1",
      status: "CREATED",
      approvalUrl: "https://paypal.test/approve",
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://paypal.test/v2/checkout/orders",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer token",
          "PayPal-Request-Id": "velora-create-order-1",
        }),
      }),
    );
  });

  it("captures an approved order", async () => {
    configurePayPal();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "token" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        id: "PAYPAL-ORDER-1",
        status: "COMPLETED",
        purchase_units: [
          { payments: { captures: [{ id: "CAPTURE-1", status: "COMPLETED" }] } },
        ],
      }), { status: 201 }));
    global.fetch = fetchMock;

    await expect(capturePayPalOrder("PAYPAL-ORDER-1")).resolves.toEqual({
      id: "PAYPAL-ORDER-1",
      status: "COMPLETED",
      captureId: "CAPTURE-1",
      captureStatus: "COMPLETED",
    });
  });
});
