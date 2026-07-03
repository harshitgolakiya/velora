import { describe, expect, it } from "vitest";
import type { Product } from "@/lib/catalog";
import { getProductRecommendations } from "@/lib/product-recommendations";

const product = (overrides: Partial<Product>): Product => ({
  id: "base",
  slug: "base-product",
  name: "Base Product",
  category: "Leggings",
  collection: "studio",
  collections: ["studio"],
  price: 200,
  rating: 0,
  reviews: 0,
  stock: 10,
  colors: ["Black"],
  sizes: ["S"],
  images: ["/base.jpg"],
  description: "Base product",
  fabric: "Nylon",
  care: "Cold wash",
  tags: ["Studio", "Compression"],
  ...overrides,
});

describe("product recommendations", () => {
  it("prioritizes category, collection, and tag matches", () => {
    const recommendations = getProductRecommendations({
      product: product({}),
      products: [
        product({ id: "base" }),
        product({ id: "strong", name: "Strong Match", category: "Leggings", collections: ["studio"], tags: ["Compression"] }),
        product({ id: "weak", name: "Weak Match", category: "Accessories", collections: ["travel"], tags: ["Bottle"] }),
      ],
    });

    expect(recommendations[0].id).toBe("strong");
  });

  it("excludes the current product and deprioritizes out-of-stock items", () => {
    const recommendations = getProductRecommendations({
      product: product({}),
      products: [
        product({ id: "base" }),
        product({ id: "sold-out", name: "Sold Out", stock: 0, collections: ["studio"], tags: ["Compression"] }),
        product({ id: "available", name: "Available", stock: 5, collections: ["studio"], tags: ["Compression"] }),
      ],
      limit: 2,
    });

    expect(recommendations.map((item) => item.id)).toEqual(["available", "sold-out"]);
  });

  it("places valid manual overrides first and backfills with ranked products", () => {
    const recommendations = getProductRecommendations({
      product: product({}),
      products: [
        product({ id: "base" }),
        product({ id: "ranked", name: "Ranked", collections: ["studio"], tags: ["Compression"] }),
        product({ id: "manual", name: "Manual", category: "Accessories", collections: ["travel"], tags: [] }),
      ],
      manualProductIds: ["missing", "manual", "manual"],
      limit: 2,
    });

    expect(recommendations.map((item) => item.id)).toEqual(["manual", "ranked"]);
  });

  it("changes ranking emphasis based on the selected strategy", () => {
    const candidates = [
      product({ id: "base" }),
      product({ id: "category", name: "Category Match", category: "Leggings", collections: ["travel"], tags: [] }),
      product({ id: "collection", name: "Collection Match", category: "Accessories", collections: ["studio"], tags: [] }),
    ];

    expect(getProductRecommendations({ product: product({}), products: candidates, strategy: "SAME_CATEGORY" })[0].id).toBe("category");
    expect(getProductRecommendations({ product: product({}), products: candidates, strategy: "SAME_COLLECTION" })[0].id).toBe("collection");
  });
});
