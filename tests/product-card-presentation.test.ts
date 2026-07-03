import { describe, expect, it } from "vitest";
import { productCardImageFit } from "@/components/store/product-card";

describe("product card presentation", () => {
  it("contains very tall studio imagery instead of cropping the product", () => {
    expect(productCardImageFit({ width: 900, height: 1500 })).toBe("object-contain");
  });

  it("keeps standard catalog imagery cropped consistently", () => {
    expect(productCardImageFit({ width: 1200, height: 1500 })).toBe("object-cover");
    expect(productCardImageFit(undefined)).toBe("object-cover");
  });
});
