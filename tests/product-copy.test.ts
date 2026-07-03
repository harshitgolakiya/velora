import { describe, expect, it } from "vitest";
import { isGenericProductCopy, splitProductCopy } from "@/lib/product-copy";

describe("product copy normalization", () => {
  it("separates flattened WooCommerce sections", () => {
    expect(
      splitProductCopy(
        "A concise summary. Product Details Mid-rise waist Soft stretch Fabric & Care Machine wash cold 75% nylon",
      ),
    ).toEqual({
      summary: "A concise summary.",
      productDetails: "Mid-rise waist Soft stretch",
      fabricCare: "Machine wash cold 75% nylon",
    });
  });

  it("keeps ordinary descriptions intact", () => {
    expect(splitProductCopy("Simple product copy.")).toEqual({
      summary: "Simple product copy.",
      productDetails: "",
      fabricCare: "",
    });
  });

  it("detects placeholder import copy", () => {
    expect(isGenericProductCopy("See garment label for composition details.")).toBe(true);
    expect(isGenericProductCopy("75% nylon, 25% spandex.")).toBe(false);
  });
});
