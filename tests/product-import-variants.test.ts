import { describe, expect, it } from "vitest";
import { buildExplicitImportVariants } from "@/lib/product-import-variants";

describe("product import variants", () => {
  it("creates only explicit CSV color-size pairs instead of a color-size matrix", () => {
    const variants = buildExplicitImportVariants("PRD-1", [
      {
        originalName: "Black",
        sizes: new Map([
          ["S", 3],
          ["M", 2],
        ]),
        skuBySize: new Map(),
      },
      {
        originalName: "Nude",
        sizes: new Map([["L", 5]]),
        skuBySize: new Map([["L", "CUSTOM-NUDE-L"]]),
      },
    ]);

    expect(variants).toEqual([
      { colorName: "Black", sizeName: "S", stock: 3, sku: "PRD-1-S-BLACK" },
      { colorName: "Black", sizeName: "M", stock: 2, sku: "PRD-1-M-BLACK" },
      { colorName: "Nude", sizeName: "L", stock: 5, sku: "CUSTOM-NUDE-L" },
    ]);
  });
});
