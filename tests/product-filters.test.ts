import { describe, expect, it } from "vitest";
import { deriveFilterOptions, filterProducts, scopedProducts } from "@/lib/product-filters";
import { normalizeFilterSettings, parseFilterSettings } from "@/lib/filter-settings";
import type { Collection, Product } from "@/lib/catalog";

const collections: Collection[] = [
  { slug: "studio", name: "Studio Sculpt", summary: "", image: "/studio.jpg" },
  { slug: "resort", name: "Resort", summary: "", image: "/resort.jpg" },
];

function product(overrides: Partial<Product>): Product {
  return {
    id: overrides.id ?? "p1",
    slug: overrides.slug ?? "p1",
    name: overrides.name ?? "Product",
    category: overrides.category ?? "Leggings",
    collection: overrides.collection ?? "studio",
    collections: overrides.collections ?? [overrides.collection ?? "studio"],
    price: overrides.price ?? 100,
    rating: overrides.rating ?? 4,
    reviews: overrides.reviews ?? 0,
    stock: overrides.stock ?? 10,
    colors: overrides.colors ?? ["Black"],
    sizes: overrides.sizes ?? ["S"],
    images: overrides.images ?? ["/a.jpg"],
    tags: overrides.tags ?? [],
    description: overrides.description ?? "",
    fabric: overrides.fabric ?? "Nylon elastane blend",
    care: overrides.care ?? "",
    ...overrides,
  };
}

describe("product filters", () => {
  it("normalizes filter visibility and ordering settings", () => {
    expect(
      normalizeFilterSettings({
        hiddenGroups: ["material", "unknown", "color"],
        groupOrder: ["color", "size"],
      }),
    ).toMatchObject({
      hiddenGroups: ["material", "color"],
      groupOrder: ["color", "size", "sort", "gender", "type", "style", "collection", "material"],
    });

    expect(parseFilterSettings("{bad json")).toMatchObject({
      hiddenGroups: [],
      groupOrder: ["sort", "gender", "size", "type", "style", "color", "collection", "material"],
    });
  });

  it("derives categories, collections, colors, sizes, materials, genders, and style tags from catalog data", () => {
    const products = [
      product({ id: "leggings", category: "Leggings", colors: ["Black", "Pearl"], sizes: ["XS", "S"], tags: ["Women", "Compression"], fabric: "Nylon and elastane" }),
      product({ id: "slipper", category: "Accessories", collection: "resort", collections: ["resort"], colors: ["Cloud"], sizes: ["One Size"], tags: ["Unisex", "Faux Fur"], fabric: "Faux fur upper" }),
    ];

    expect(deriveFilterOptions({ products, categories: ["Accessories", "Leggings", "Empty"], collections })).toMatchObject({
      categories: ["Accessories", "Leggings"],
      collections,
      colors: ["Black", "Cloud", "Pearl"],
      sizes: ["One Size", "S", "XS"],
      genders: ["Women", "Unisex"],
      materials: ["Nylon", "Elastane", "Faux Fur"],
      styles: ["Compression"],
    });
  });

  it("scopes visible options to the current collection", () => {
    const products = [
      product({ id: "studio", category: "Leggings", collection: "studio", collections: ["studio"], colors: ["Black"], sizes: ["S"], tags: ["Women"] }),
      product({ id: "resort", category: "Accessories", collection: "resort", collections: ["resort"], colors: ["Cloud"], sizes: ["One Size"], tags: ["Unisex", "Faux Fur"], fabric: "Faux fur" }),
    ];

    expect(scopedProducts(products, "studio").map((item) => item.id)).toEqual(["studio"]);
    expect(deriveFilterOptions({ products, categories: ["Accessories", "Leggings"], collections, currentCollection: "studio" })).toMatchObject({
      categories: ["Leggings"],
      collections: [],
      colors: ["Black"],
      sizes: ["S"],
      genders: ["Women"],
      materials: ["Nylon", "Elastane"],
    });
  });

  it("omits empty and placeholder imported attributes from customer filters", () => {
    const products = [
      product({
        id: "clean",
        colors: [" Black ", "Default", "N/A", ""],
        sizes: ["S", "s", "Select option", ""],
        tags: ["Compression", "Default", "--"],
      }),
    ];

    expect(deriveFilterOptions({ products, categories: ["Leggings"], collections })).toMatchObject({
      colors: ["Black"],
      sizes: ["S"],
      styles: ["Compression"],
    });
  });

  it("filters products by imported material tags as well as fabric text", () => {
    const products = [
      product({ id: "tagged", tags: ["Faux Fur"], fabric: "Synthetic upper" }),
      product({ id: "fabric", tags: [], fabric: "Soft modal jersey" }),
      product({ id: "other", tags: [], fabric: "Cotton blend" }),
    ];

    expect(filterProducts({
      products,
      selectedCollection: "All",
      category: "All",
      size: "All",
      color: "All",
      gender: "All",
      style: "All",
      material: "Faux Fur",
    }).map((item) => item.id)).toEqual(["tagged"]);

    expect(filterProducts({
      products,
      selectedCollection: "All",
      category: "All",
      size: "All",
      color: "All",
      gender: "All",
      style: "All",
      material: "Modal",
    }).map((item) => item.id)).toEqual(["fabric"]);
  });
});
