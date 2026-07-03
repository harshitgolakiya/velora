import { beforeEach, describe, expect, it, vi } from "vitest";
import { productJsonLd } from "@/lib/seo";

vi.mock("@/lib/cms", () => ({
  getCmsProducts: vi.fn(async () => [
    {
      slug: "sculpt-legging",
      updatedAt: "2026-07-01T00:00:00.000Z",
    },
  ]),
  getCmsCollections: vi.fn(async () => [
    { slug: "studio" },
  ]),
}));

describe("seo indexation safeguards", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://velora.test");
  });

  it("keeps private and filtered URLs out of the sitemap", async () => {
    const { default: sitemap } = await import("@/app/sitemap");
    const entries = await sitemap();
    const urls = entries.map((entry) => entry.url);

    expect(urls).toContain("https://velora.test/shop");
    expect(urls).toContain("https://velora.test/product/sculpt-legging");
    expect(urls).toContain("https://velora.test/collections/studio");
    expect(urls).not.toContain("https://velora.test/account");
    expect(urls).not.toContain("https://velora.test/cart");
    expect(urls.some((url) => url.includes("?"))).toBe(false);
  });

  it("disallows private, checkout, search, and parameterized URLs in robots", async () => {
    const { default: robots } = await import("@/app/robots");
    const config = robots();
    const rules = Array.isArray(config.rules) ? config.rules[0] : config.rules;

    expect(config.sitemap).toBe("https://velora.test/sitemap.xml");
    expect(rules.disallow).toEqual(expect.arrayContaining([
      "/admin",
      "/account",
      "/checkout",
      "/cart",
      "/search",
      "/*?*",
    ]));
  });
});

describe("commerce structured data", () => {
  it("uses variant-level offer availability and absolute canonical product URLs", () => {
    const data = productJsonLd({
      id: "product_1",
      slug: "sculpt-legging",
      name: "Sculpt Legging",
      sku: "VEL-SCULPT",
      description: "Studio legging",
      fabric: "Performance knit",
      care: "Cold wash",
      category: "Leggings",
      collection: "Studio",
      collections: ["Studio"],
      colors: ["Black"],
      sizes: ["S", "M"],
      price: 320,
      stock: 0,
      rating: 4.8,
      reviews: 12,
      images: ["/images/sculpt.jpg"],
      variants: [
        {
          id: "variant_1",
          sku: "VEL-SCULPT-BLK-S",
          stock: 0,
          allowBackorder: true,
          color: { id: "black", name: "Black", hex: "#000000" },
          size: { id: "s", name: "S" },
          media: [],
        },
      ],
    });

    expect(data).toMatchObject({
      "@type": "Product",
      brand: { "@type": "Brand", name: "Velora" },
      aggregateRating: { "@type": "AggregateRating", reviewCount: 12 },
    });
    expect(data.image).toEqual(["https://velora.test/images/sculpt.jpg"]);
    expect(data.offers).toEqual([
      expect.objectContaining({
        sku: "VEL-SCULPT-BLK-S",
        availability: "https://schema.org/BackOrder",
        url: "https://velora.test/product/sculpt-legging?color=Black&size=S",
      }),
    ]);
  });
});
