import { describe, expect, it } from "vitest";
import { localizedAlternates } from "@/lib/seo";

describe("localized SEO metadata", () => {
  it("builds canonical and hreflang alternates for English and Arabic storefront URLs", () => {
    expect(localizedAlternates("/product/soft-leggings-7460")).toEqual({
      canonical: "/product/soft-leggings-7460",
      languages: {
        en: "/product/soft-leggings-7460",
        ar: "/ar/product/soft-leggings-7460",
        "x-default": "/product/soft-leggings-7460",
      },
    });
  });

  it("normalizes Arabic-prefixed input before generating alternates", () => {
    expect(localizedAlternates("/ar/shop")).toEqual({
      canonical: "/shop",
      languages: {
        en: "/shop",
        ar: "/ar/shop",
        "x-default": "/shop",
      },
    });
  });
});
