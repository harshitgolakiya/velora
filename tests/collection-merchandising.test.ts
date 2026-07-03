import { describe, expect, it } from "vitest";
import { stableSort } from "@/components/store/shop-controls";
import type { Product } from "@/lib/catalog";

function product(input: Partial<Product> & Pick<Product, "id" | "name">): Product {
  return {
    id: input.id,
    sku: input.sku,
    slug: input.slug ?? input.id,
    name: input.name,
    description: input.description ?? "Product description",
    fabric: input.fabric ?? "Nylon blend",
    care: input.care ?? "Machine wash cold",
    category: input.category ?? "Tops",
    collection: input.collection ?? "summer",
    collections: input.collections ?? ["summer"],
    collectionMerchandising: input.collectionMerchandising,
    price: input.price ?? 100,
    salePrice: input.salePrice,
    rating: input.rating ?? 0,
    reviews: input.reviews ?? 0,
    stock: input.stock ?? 10,
    colors: input.colors ?? ["Black"],
    sizes: input.sizes ?? ["S"],
    featured: input.featured,
    bestSeller: input.bestSeller,
    newArrival: input.newArrival,
    images: input.images ?? ["/images/velora/hero-sculpted-essentials.jpg"],
    variants: input.variants ?? [],
  };
}

describe("collection merchandising sort", () => {
  it("puts pinned collection products first and then respects sort order", () => {
    const sorted = stableSort(
      [
        product({ id: "b", name: "B", collectionMerchandising: { summer: { sortOrder: 1, pinned: false } } }),
        product({ id: "p", name: "Pinned", collectionMerchandising: { summer: { sortOrder: 99, pinned: true } } }),
        product({ id: "a", name: "A", collectionMerchandising: { summer: { sortOrder: 0, pinned: false } } }),
      ],
      "popular",
      "summer",
    );

    expect(sorted.map((item) => item.id)).toEqual(["p", "a", "b"]);
  });

  it("keeps explicit price sorting independent from merchandising", () => {
    const sorted = stableSort(
      [
        product({ id: "high", name: "High", price: 200, collectionMerchandising: { summer: { sortOrder: 0, pinned: true } } }),
        product({ id: "low", name: "Low", price: 50, collectionMerchandising: { summer: { sortOrder: 1, pinned: false } } }),
      ],
      "low",
      "summer",
    );

    expect(sorted.map((item) => item.id)).toEqual(["low", "high"]);
  });
});
