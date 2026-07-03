import { describe, expect, it } from "vitest";
import { products, type Product } from "@/lib/catalog";
import { filterPublicProducts, isPublicProduct } from "@/lib/public-catalog";
import { getProductRecommendations } from "@/lib/product-recommendations";
import { searchStore } from "@/lib/store-search";

function withStatus(product: Product, status?: string, deletedAt?: string) {
  return { ...product, status, deletedAt };
}

describe("public catalog visibility", () => {
  it("allows products with no legacy status and published products only", () => {
    expect(isPublicProduct(withStatus(products[0]))).toBe(true);
    expect(isPublicProduct(withStatus(products[0], "PUBLISHED"))).toBe(true);
    expect(isPublicProduct(withStatus(products[0], "DRAFT"))).toBe(false);
    expect(isPublicProduct(withStatus(products[0], "SCHEDULED"))).toBe(false);
    expect(isPublicProduct(withStatus(products[0], "ARCHIVED"))).toBe(false);
    expect(isPublicProduct(withStatus(products[0], "PUBLISHED", "2026-06-28T00:00:00.000Z"))).toBe(false);
  });

  it("keeps non-public products out of search input lists", () => {
    const draft = withStatus({ ...products[1], id: "draft-product", name: "Hidden Draft Pearl" }, "DRAFT");
    const visible = filterPublicProducts([products[0], draft]);
    const results = searchStore("Hidden Draft Pearl", visible, [], []);

    expect(results.products).toEqual([]);
  });

  it("keeps non-public manual overrides out of recommendations", () => {
    const draft = withStatus({ ...products[1], id: "draft-product", name: "Hidden Draft Pearl" }, "DRAFT");
    const published = withStatus({ ...products[2], id: "published-product" }, "PUBLISHED");
    const recommendations = getProductRecommendations({
      product: products[0],
      products: [products[0], draft, published],
      manualProductIds: ["draft-product", "published-product"],
    });

    expect(recommendations.map((product) => product.id)).toEqual(["published-product"]);
  });
});
