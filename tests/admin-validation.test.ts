import { describe, expect, it } from "vitest";
import {
  createProductSchema,
  updateOrderSchema,
  updateProductSchema,
  updateStockSchema,
} from "@/lib/admin-validation";

const validProduct = {
  name: "Aura Legging",
  sku: "AURA",
  price: 340,
  categoryId: "category-1",
  description: "Compression legging",
  fabricDetails: "Recycled nylon",
  careInstructions: "Cold wash",
  sizeNames: ["XS", "S"],
  colors: [
    {
      name: "Ink",
      hex: "#111315",
      images: ["/images/aura.jpg"],
      stockBySize: { XS: 4, S: 2 },
      skuBySize: { XS: "AURA-INK-XS", S: "AURA-INK-S" },
    },
  ],
};

describe("admin API validation contracts", () => {
  it("accepts a complete product create payload and applies defaults", () => {
    const result = createProductSchema.parse(validProduct);
    expect(result.status).toBe("DRAFT");
    expect(result.collectionIds).toEqual([]);
    expect(result.colors[0].stockBySize.XS).toBe(4);
  });

  it("accepts direct HTTPS product video URLs", () => {
    const video = "https://pub-912a38d4c1604d0086885c4ab8be284e.r2.dev/Core-Legging-black.mp4";
    const createResult = createProductSchema.parse({
      ...validProduct,
      colors: [{ ...validProduct.colors[0], video }],
    });
    const updateResult = updateProductSchema.parse({
      ...validProduct,
      status: "PUBLISHED",
      colors: [{ ...validProduct.colors[0], video }],
    });

    expect(createResult.colors[0].video).toBe(video);
    expect(updateResult.colors?.[0].video).toBe(video);
  });

  it("rejects non-video product video URLs", () => {
    const result = createProductSchema.safeParse({
      ...validProduct,
      colors: [{ ...validProduct.colors[0], video: "https://example.com/not-a-video.jpg" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid product pricing, colors, and empty variants", () => {
    const result = createProductSchema.safeParse({
      ...validProduct,
      price: 0,
      sizeNames: [],
      colors: [{ ...validProduct.colors[0], hex: "black" }],
    });
    expect(result.success).toBe(false);
  });

  it("accepts full product edits including scheduled publishing", () => {
    const result = updateProductSchema.parse({
      ...validProduct,
      slug: "aura-legging",
      status: "SCHEDULED",
      scheduledAt: "2026-07-01T08:00:00.000Z",
    });
    expect(result.status).toBe("SCHEDULED");
    expect(result.scheduledAt).toBe("2026-07-01T08:00:00.000Z");
  });

  it("normalizes an empty refund and rejects negative refunds", () => {
    const base = {
      status: "PROCESSING",
      paymentStatus: "paid",
      fulfillmentStatus: "unfulfilled",
    };
    expect(updateOrderSchema.parse({ ...base, refundAmount: "" }).refundAmount).toBeUndefined();
    expect(updateOrderSchema.safeParse({ ...base, refundAmount: -1 }).success).toBe(false);
  });

  it("coerces inventory form values and rejects negative stock", () => {
    expect(
      updateStockSchema.parse({
        stock: "12",
        reservedStock: "3",
        lowStockThreshold: "5",
        allowBackorder: true,
      }),
    ).toMatchObject({ stock: 12, reservedStock: 3, lowStockThreshold: 5 });
    expect(updateStockSchema.safeParse({ stock: -1 }).success).toBe(false);
  });
});
