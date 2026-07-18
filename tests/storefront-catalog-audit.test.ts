import { describe, expect, it } from "vitest";
import { products, type Product } from "@/lib/catalog";
import { getDbProducts } from "@/lib/catalog-db";
import { auditStorefrontCatalog, auditStorefrontProduct } from "@/lib/storefront-catalog-audit";

describe("storefront catalog audit", () => {
  it("reports PDP-blocking storefront product gaps", () => {
    const broken = {
      ...products[0],
      price: 0,
      salePrice: 10,
      colors: ["Black", "Black"],
      sizes: ["S"],
      variants: [],
      images: [],
      variantMediaByColor: {},
    } as Product;

    expect(auditStorefrontProduct(broken)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "price" }),
        expect.objectContaining({ field: "salePrice" }),
        expect.objectContaining({ field: "colors" }),
        expect.objectContaining({ field: "variants" }),
        expect.objectContaining({ field: "images" }),
        expect.objectContaining({ field: "variantMediaByColor" }),
      ]),
    );
  });

  it("passes every currently published storefront product", async () => {
    const publishedProducts = await getDbProducts("en");
    const issues = auditStorefrontCatalog(publishedProducts);
    const criticalIssues = issues.filter((issue) => issue.severity === "critical");

    expect(publishedProducts.length).toBeGreaterThan(0);
    expect(criticalIssues).toEqual([]);
  });
});
