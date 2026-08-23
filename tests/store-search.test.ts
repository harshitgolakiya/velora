import { describe, expect, it } from "vitest";
import type { Product } from "@/lib/catalog";
import { defaultSearchMerchandisingSettings, getSearchRedirect } from "@/lib/search-merchandising";
import { searchStore, suggestSearchQuery } from "@/lib/store-search";

const product = (overrides: Partial<Product>): Product => ({
  id: "1",
  slug: "flared-pants",
  name: "Flared Pants",
  category: "Leggings",
  collection: "",
  price: 219,
  rating: 0,
  reviews: 0,
  stock: 4,
  colors: ["Nude"],
  sizes: ["S"],
  images: ["/pants.jpg"],
  description: "Soft stretch studio pants",
  fabric: "75% nylon 25% spandex",
  care: "Machine wash cold",
  ...overrides,
});

describe("store search", () => {
  it("ranks exact product names", () => {
    const results = searchStore("flared pants", [product({}), product({ id: "2", name: "Soft Leggings" })], ["Leggings"], []);
    expect(results.products[0].name).toBe("Flared Pants");
  });

  it("ranks a product name match above category and tag-only matches", () => {
    const results = searchStore(
      "soft",
      [
        product({ id: "tag", name: "Training Bra", tags: ["Soft"] }),
        product({ id: "category", name: "Studio Pant", category: "Soft Layers" }),
        product({ id: "name", name: "Soft Leggings" }),
      ],
      ["Soft Layers"],
      [],
    );

    expect(results.products.map((item) => item.id)).toEqual(["name", "category", "tag"]);
  });

  it("supports small spelling mistakes", () => {
    const results = searchStore("flred", [product({})], ["Leggings"], []);
    expect(results.products).toHaveLength(1);
  });

  it("matches Arabic product and category text", () => {
    const arabicProduct = product({ name: "ليقنز ناعم", category: "ليقنز", colors: ["أسود"] });
    expect(searchStore("ناعم", [arabicProduct], ["ليقنز"], []).products).toHaveLength(1);
    expect(searchStore("ليقنز", [arabicProduct], ["ليقنز"], []).categories).toEqual(["ليقنز"]);
  });

  it("suggests a close catalog term for a zero-result typo", () => {
    expect(suggestSearchQuery("legins", [product({})], ["Leggings"], [])).toBe("leggings");
  });

  it("searches colors, tags, categories, and collections", () => {
    const tagged = product({ tags: ["Studio"], colors: ["Olive"] });
    expect(searchStore("olive", [tagged], [], []).products).toHaveLength(1);
    expect(searchStore("studio", [tagged], [], []).products).toHaveLength(1);
    expect(searchStore("leggings", [tagged], ["Leggings"], []).categories).toEqual(["Leggings"]);
    expect(
      searchStore("after", [], [], [{ slug: "after-hours", name: "After Hours", summary: "Evening edit", image: "/a.jpg" }]).collections[0].slug,
    ).toBe("after-hours");
  });

  it("searches support and editorial pages", () => {
    expect(searchStore("refund", [], [], []).pages[0].href).toBe("/returns");
    expect(searchStore("fit guide", [], [], []).pages[0].href).toBe("/fabric-guide");
    expect(searchStore("laundry", [], [], []).pages[0].href).toBe("/care-guide");
  });

  it("returns empty result groups for unmatched queries", () => {
    const results = searchStore("zzzznotfound", [product({})], ["Leggings"], []);
    expect(results.products).toEqual([]);
    expect(results.categories).toEqual([]);
    expect(results.collections).toEqual([]);
    expect(results.pages).toEqual([]);
  });

  it("expands product matches with search synonyms", () => {
    const results = searchStore(
      "yoga pants",
      [product({ id: "leggings", name: "Studio Leggings" })],
      ["Leggings"],
      [],
      undefined,
      {
        ...defaultSearchMerchandisingSettings,
        synonyms: { "yoga pants": ["leggings"] },
      },
    );

    expect(results.products.map((item) => item.id)).toEqual(["leggings"]);
  });

  it("resolves normalized search redirects", () => {
    expect(getSearchRedirect("Return Policy", {
      ...defaultSearchMerchandisingSettings,
      redirects: { "return policy": "/returns" },
    })).toBe("/returns");
  });

  it("pins configured products first, including products without a text match", () => {
    const results = searchStore(
      "leggings",
      [
        product({ id: "matched", name: "Soft Leggings" }),
        product({ id: "pinned", name: "Training Bra", category: "Bras" }),
      ],
      ["Leggings"],
      [],
      undefined,
      {
        ...defaultSearchMerchandisingSettings,
        pinnedProducts: { leggings: ["pinned", "matched"] },
      },
    );

    expect(results.products.map((item) => item.id)).toEqual(["pinned", "matched"]);
  });

  it("boosts and buries configured product matches", () => {
    const results = searchStore(
      "studio",
      [
        product({ id: "buried", name: "Studio Leggings" }),
        product({ id: "boosted", name: "Studio Bra", category: "Bras" }),
      ],
      [],
      [],
      undefined,
      {
        ...defaultSearchMerchandisingSettings,
        boostedProducts: { studio: ["boosted"] },
        buriedProducts: { studio: ["buried"] },
      },
    );

    expect(results.products.map((item) => item.id)).toEqual(["boosted", "buried"]);
  });
});
