import { describe, expect, it } from "vitest";
import { products, type Product } from "@/lib/catalog";
import { productFieldContract, validateStorefrontProductContract } from "@/lib/product-field-contract";

describe("product field contract", () => {
  it("documents the admin-to-storefront mapping for product-critical fields", () => {
    expect(productFieldContract.map((item) => item.storefrontField)).toEqual(
      expect.arrayContaining([
        "name",
        "slug",
        "price",
        "description",
        "fabric",
        "care",
        "fitSummary",
        "modelReference",
        "sizeAdvice",
        "dimensionNotes",
        "colors",
        "sizes",
        "variants",
        "images",
      ]),
    );
  });

  it("passes a complete storefront product contract", () => {
    const complete = {
      ...products[0],
      variants: [
        {
          id: "variant-1",
          stock: 4,
          color: { id: "Black", name: "Black", hex: "#111111" },
          size: { id: "S", name: "S" },
          media: [],
        },
      ],
    } as Product;

    expect(validateStorefrontProductContract(complete)).toEqual([]);
  });

  it("reports missing required storefront fields", () => {
    const broken = {
      ...products[0],
      images: [],
      colors: [],
      sizes: [],
      variants: [],
    } as Product;

    expect(validateStorefrontProductContract(broken).map((issue) => issue.field)).toEqual([
      "colors",
      "sizes",
      "variants",
      "images",
    ]);
  });
});
