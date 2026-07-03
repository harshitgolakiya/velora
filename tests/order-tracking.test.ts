import { beforeEach, describe, expect, it, vi } from "vitest";

const { findFirst } = vi.hoisted(() => ({
  findFirst: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    order: { findFirst },
  },
}));

import { POST } from "@/app/api/orders/track/route";

function request(body: unknown) {
  return new Request("http://localhost/api/orders/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("order tracking", () => {
  beforeEach(() => {
    findFirst.mockReset();
  });

  it("normalizes order number and email before lookup", async () => {
    findFirst.mockResolvedValue({
      orderNumber: "VL-1001",
      status: "PROCESSING",
      paymentStatus: "PAID",
      fulfillmentStatus: "UNFULFILLED",
      shipment: null,
      items: [{ quantity: 2 }, { quantity: 1 }],
      updatedAt: new Date("2026-06-14T08:00:00.000Z"),
    });

    const response = await POST(
      request({ orderNumber: "vl-1001", email: "CUSTOMER@EXAMPLE.COM" }),
    );

    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          orderNumber: "VL-1001",
          email: "customer@example.com",
        },
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      order: { orderNumber: "VL-1001", itemCount: 3 },
    });
  });

  it("returns a generic response when the details do not match", async () => {
    findFirst.mockResolvedValue(null);

    const response = await POST(
      request({ orderNumber: "VL-9999", email: "customer@example.com" }),
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      message: "No order matched those details",
    });
  });
});
