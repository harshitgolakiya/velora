import { beforeEach, describe, expect, it, vi } from "vitest";

const { transaction, getAuthorizedAccountOrder } = vi.hoisted(() => ({
  transaction: vi.fn(),
  getAuthorizedAccountOrder: vi.fn(),
}));

vi.mock("@/lib/account-data", () => ({
  requireCustomerSession: vi.fn().mockResolvedValue({
    user: { id: "user-1", email: "customer@example.com" },
  }),
}));
vi.mock("@/lib/account-orders", () => ({ getAuthorizedAccountOrder }));
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: transaction } }));
vi.mock("@/lib/store-settings", () => ({ getReturnSettings: vi.fn() }));
vi.mock("@/lib/return-notifications", () => ({ sendReturnLifecycleNotification: vi.fn() }));

import { DELETE } from "@/app/api/account/orders/[orderNumber]/return-request/route";

function deleteRequest(origin = "http://localhost") {
  return new Request("http://localhost/api/account/orders/VL-100/return-request", {
    method: "DELETE",
    headers: { "Origin": origin },
  });
}

describe("customer return cancellation", () => {
  beforeEach(() => {
    transaction.mockReset();
    getAuthorizedAccountOrder.mockReset();
    getAuthorizedAccountOrder.mockResolvedValue({ returnRequests: [{ id: "return-1" }] });
  });

  it("cancels an approved exchange and releases reserved inventory", async () => {
    const variantUpdate = vi.fn().mockResolvedValue({});
    const returnUpdate = vi.fn().mockResolvedValue({
      status: "CANCELLED",
      updatedAt: new Date("2026-06-20T10:00:00.000Z"),
      events: [{ id: "event-1", status: "CANCELLED", message: "Request cancelled by customer before pickup processing", createdAt: new Date("2026-06-20T10:00:00.000Z") }],
    });
    const tx = {
      returnRequest: {
        findUnique: vi.fn().mockResolvedValue({
          id: "return-1",
          status: "APPROVED",
          resolution: "EXCHANGE",
          items: [{ quantity: 2, requestedVariantId: "variant-2", requestedVariant: { reservedStock: 3 } }],
        }),
        update: returnUpdate,
      },
      productVariant: { update: variantUpdate },
    };
    transaction.mockImplementation(async (callback) => callback(tx));

    const response = await DELETE(deleteRequest(), {
      params: Promise.resolve({ orderNumber: "VL-100" }),
    });

    expect(response.status).toBe(200);
    expect(variantUpdate).toHaveBeenCalledWith({ where: { id: "variant-2" }, data: { reservedStock: 1 } });
    expect(returnUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "CANCELLED" }) }));
  });

  it("rejects cancellation after pickup processing starts", async () => {
    transaction.mockImplementation(async (callback) => callback({
      returnRequest: { findUnique: vi.fn().mockResolvedValue({ id: "return-1", status: "PICKUP_SCHEDULED", resolution: "RETURN", items: [] }) },
    }));

    const response = await DELETE(deleteRequest(), {
      params: Promise.resolve({ orderNumber: "VL-100" }),
    });

    expect(response.status).toBe(409);
  });

  it("rejects cross-site cancellation before loading the account order", async () => {
    const response = await DELETE(deleteRequest("https://attacker.test"), {
      params: Promise.resolve({ orderNumber: "VL-100" }),
    });

    expect(response.status).toBe(403);
    expect(getAuthorizedAccountOrder).not.toHaveBeenCalled();
    expect(transaction).not.toHaveBeenCalled();
  });
});
