import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  conversionUpsert: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    searchConversionEvent: { upsert: mocks.conversionUpsert },
  },
}));

describe("search purchase analytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("upserts purchase conversions by order id so checkout retries do not duplicate analytics", async () => {
    const { recordSearchConversionEvent } = await import("@/lib/search-analytics");
    mocks.conversionUpsert.mockResolvedValue({ id: "conversion_1" });

    await recordSearchConversionEvent({
      attribution: {
        query: "black leggings",
        source: "results_page",
        resultType: "product",
        resultId: "product_1",
        href: "/products/black-legging",
      },
      orderId: "order_1",
      conversionValue: 420,
    });

    expect(mocks.conversionUpsert).toHaveBeenCalledWith({
      where: { orderId: "order_1" },
      create: expect.objectContaining({
        normalizedQuery: "black leggings",
        orderId: "order_1",
        conversionValue: 420,
      }),
      update: expect.objectContaining({
        normalizedQuery: "black leggings",
        conversionValue: 420,
      }),
    });
  });
});
