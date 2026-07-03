import { beforeEach, describe, expect, it, vi } from "vitest";

const { transaction } = vi.hoisted(() => ({
  transaction: vi.fn(),
}));

vi.mock("@/lib/admin-api", () => ({
  requireAdminApiPermission: vi.fn().mockResolvedValue({
    access: { name: "Test admin" },
  }),
}));

vi.mock("@/lib/admin-activity", () => ({
  recordAdminActivity: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: transaction,
    product: { findUnique: vi.fn() },
  },
}));

vi.mock("@/lib/admin-product-validation", () => ({
  validateProductSkus: vi.fn(),
}));

vi.mock("@/lib/admin-catalog", () => ({
  mapAdminInventoryRow: vi.fn(),
  mapAdminProduct: vi.fn(),
}));

import { POST as createProduct } from "@/app/api/admin/products/route";
import { PATCH as updateInventory } from "@/app/api/admin/inventory/[variantId]/route";
import { PATCH as updateOrder } from "@/app/api/admin/orders/[id]/route";

function jsonRequest(url: string, body: unknown) {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("admin route validation", () => {
  beforeEach(() => {
    transaction.mockClear();
  });

  it("returns 400 for an invalid product create request", async () => {
    const response = await createProduct(jsonRequest("http://localhost/api/admin/products", { name: "A" }));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ message: "Invalid product payload" });
    expect(transaction).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid order update request", async () => {
    const response = await updateOrder(
      jsonRequest("http://localhost/api/admin/orders/order-1", { status: "UNKNOWN" }),
      { params: Promise.resolve({ id: "order-1" }) },
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ message: "Invalid order payload" });
    expect(transaction).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid inventory update request", async () => {
    const response = await updateInventory(
      jsonRequest("http://localhost/api/admin/inventory/variant-1", { stock: -5 }),
      { params: Promise.resolve({ variantId: "variant-1" }) },
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ message: "Invalid inventory payload" });
    expect(transaction).not.toHaveBeenCalled();
  });
});
