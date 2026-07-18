import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  productFindFirst: vi.fn(),
  alertFindFirst: vi.fn(),
  alertCreate: vi.fn(),
  alertUpdate: vi.fn(),
  alertUpdateMany: vi.fn(),
}));

vi.mock("next-auth", () => ({ getServerSession: mocks.getServerSession }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    product: { findFirst: mocks.productFindFirst },
    productAlertSubscription: {
      findFirst: mocks.alertFindFirst,
      create: mocks.alertCreate,
      update: mocks.alertUpdate,
      updateMany: mocks.alertUpdateMany,
    },
  },
}));

import { DELETE, POST } from "@/app/api/product-alerts/route";

const payload = {
  type: "PRICE_DROP",
  email: "customer@example.com",
  productId: "product-1",
  targetPrice: 150,
};

function request(method: "POST" | "DELETE", body = payload, origin = "http://localhost") {
  return new Request("http://localhost/api/product-alerts", {
    method,
    headers: { "Origin": origin },
    body: JSON.stringify(body),
  });
}

describe("product alert subscriptions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getServerSession.mockResolvedValue(null);
    mocks.productFindFirst.mockResolvedValue({
      id: "product-1",
      title: "Soft Legging",
      price: 200,
      salePrice: null,
    });
  });

  it("deduplicates an active alert", async () => {
    mocks.alertFindFirst.mockResolvedValue({ id: "alert-1", status: "ACTIVE" });
    const response = await POST(request("POST"));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ created: false });
    expect(mocks.alertCreate).not.toHaveBeenCalled();
    expect(mocks.alertUpdate).not.toHaveBeenCalled();
  });

  it("reactivates an unsubscribed alert", async () => {
    mocks.alertFindFirst.mockResolvedValue({ id: "alert-1", status: "UNSUBSCRIBED" });
    mocks.alertUpdate.mockResolvedValue({ id: "alert-1", type: "PRICE_DROP" });
    const response = await POST(request("POST"));

    expect(response.status).toBe(201);
    expect(mocks.alertUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "alert-1" },
      data: expect.objectContaining({ status: "ACTIVE", targetPrice: 150 }),
    }));
    expect(mocks.alertCreate).not.toHaveBeenCalled();
  });

  it("unsubscribes the matching active alert", async () => {
    mocks.alertUpdateMany.mockResolvedValue({ count: 1 });
    const response = await DELETE(request("DELETE"));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ removed: true });
    expect(mocks.alertUpdateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        email: "customer@example.com",
        productId: "product-1",
        status: "ACTIVE",
      }),
      data: { status: "UNSUBSCRIBED" },
    }));
  });

  it("rejects cross-site alert mutations before product lookup", async () => {
    const response = await POST(request("POST", payload, "https://attacker.test"));

    expect(response.status).toBe(403);
    expect(mocks.productFindFirst).not.toHaveBeenCalled();
    expect(mocks.alertFindFirst).not.toHaveBeenCalled();
  });
});
