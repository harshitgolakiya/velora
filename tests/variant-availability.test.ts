import { describe, expect, it } from "vitest";
import { getVariantAvailability } from "@/lib/variant-availability";
import type { Product, ProductVariant } from "@/lib/catalog";

function variant(color: string, size: string, stock: number, allowBackorder = false): ProductVariant {
  return {
    id: `${color}-${size}`,
    color: { id: color, name: color, hex: "#000" },
    size: { id: size, name: size },
    stock,
    allowBackorder,
    media: [],
  };
}

const product = {
  stock: 3,
  variants: [
    variant("Black", "S", 0),
    variant("Black", "M", 4),
    variant("Nude", "S", 2),
    variant("Nude", "M", 0),
    variant("Blue", "S", 0, true),
  ],
} as Pick<Product, "variants" | "stock">;

describe("variant availability", () => {
  it("falls back to an available size in the selected color", () => {
    const result = getVariantAvailability(product, "Black", "S");
    expect(result.selectedSizeAvailable).toBe(false);
    expect(result.effectiveSize).toBe("M");
    expect(result.availableSizesForColor).toEqual(["M"]);
    expect(result.needsRecovery).toBe(true);
  });

  it("suggests other colors that have the requested size available", () => {
    const result = getVariantAvailability(product, "Black", "S");
    expect(result.sameSizeAlternativeColors).toEqual(["Nude", "Blue"]);
  });

  it("treats backorder variants as sellable", () => {
    const result = getVariantAvailability(product, "Blue", "S");
    expect(result.selectedSizeAvailable).toBe(true);
    expect(result.canBackorder).toBe(true);
    expect(result.outOfStock).toBe(false);
  });

  it("keeps large custom size sets available for recovery choices", () => {
    const largeSizeProduct = {
      stock: 12,
      variants: ["2XS", "XS", "S", "M", "L", "XL", "2XL"].map((size) =>
        variant("Black", size, size === "2XL" ? 0 : 2),
      ),
    } as Pick<Product, "variants" | "stock">;

    const result = getVariantAvailability(largeSizeProduct, "Black", "2XL");
    expect(result.availableSizesForColor).toEqual(["2XS", "XS", "S", "M", "L", "XL"]);
    expect(result.effectiveSize).toBe("2XS");
    expect(result.needsRecovery).toBe(true);
  });
});
