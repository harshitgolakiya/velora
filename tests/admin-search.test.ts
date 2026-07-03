import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requirePermission: vi.fn(),
  productFindMany: vi.fn(),
  orderFindMany: vi.fn(),
  userFindMany: vi.fn(),
  mediaFindMany: vi.fn(),
}));

vi.mock("@/lib/admin-api", () => ({
  requireAdminApiPermission: mocks.requirePermission,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    product: { findMany: mocks.productFindMany },
    order: { findMany: mocks.orderFindMany },
    user: { findMany: mocks.userFindMany },
    mediaAsset: { findMany: mocks.mediaFindMany },
  },
}));

import { GET } from "@/app/api/admin/search/route";

describe("admin server search", () => {
  beforeEach(() => {
    mocks.requirePermission.mockResolvedValue({ access: { id: "admin-1" } });
    mocks.productFindMany.mockResolvedValue([]);
    mocks.orderFindMany.mockResolvedValue([]);
    mocks.userFindMany.mockResolvedValue([]);
    mocks.mediaFindMany.mockResolvedValue([]);
  });

  it("does not query the database for one-character searches", async () => {
    const response = await GET(new Request("http://localhost/api/admin/search?q=a"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ results: [] });
    expect(mocks.productFindMany).not.toHaveBeenCalled();
  });

  it("returns normalized cross-entity results", async () => {
    mocks.productFindMany.mockResolvedValue([
      { id: "product-1", title: "Aura Legging", sku: "AURA", slug: "aura-legging", status: "PUBLISHED" },
    ]);
    mocks.orderFindMany.mockResolvedValue([
      { id: "order-1", orderNumber: "VEL-1001", email: "aisha@example.com", status: "PAID" },
    ]);

    const response = await GET(new Request("http://localhost/api/admin/search?q=aura"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ section: "products", href: "/admin/products/product-1" }),
        expect.objectContaining({ section: "orders", title: "VEL-1001" }),
      ]),
    );
  });
});
