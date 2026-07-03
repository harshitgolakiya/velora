import type { Product } from "./catalog";
import { filterPublicProducts } from "./public-catalog";

export type RecommendationStrategy = "BALANCED" | "SAME_CATEGORY" | "SAME_COLLECTION" | "BEST_SELLERS";

function overlapScore(left: string[] = [], right: string[] = [], points: number) {
  const rightSet = new Set(right.map((item) => item.toLowerCase()));
  return left.reduce((score, item) => score + (rightSet.has(item.toLowerCase()) ? points : 0), 0);
}

export function getProductRecommendations({
  product,
  products,
  limit = 4,
  strategy = "BALANCED",
  manualProductIds = [],
}: {
  product: Product;
  products: Product[];
  limit?: number;
  strategy?: RecommendationStrategy;
  manualProductIds?: string[];
}) {
  const basePrice = product.salePrice ?? product.price;
  const candidates = filterPublicProducts(products).filter((item) => item.id !== product.id);
  const candidateById = new Map(candidates.map((item) => [item.id, item]));
  const manual = Array.from(new Set(manualProductIds))
    .map((id) => candidateById.get(id))
    .filter((item): item is Product => Boolean(item));
  const manualIds = new Set(manual.map((item) => item.id));

  const weights = strategy === "SAME_CATEGORY"
    ? { category: 24, collection: 6, tag: 3, bestSeller: 2 }
    : strategy === "SAME_COLLECTION"
      ? { category: 5, collection: 24, tag: 3, bestSeller: 2 }
      : strategy === "BEST_SELLERS"
        ? { category: 3, collection: 3, tag: 2, bestSeller: 30 }
        : { category: 12, collection: 8, tag: 5, bestSeller: 2 };

  const ranked = candidates
    .filter((item) => !manualIds.has(item.id))
    .map((item) => {
      const itemPrice = item.salePrice ?? item.price;
      const priceDistance = basePrice > 0 ? Math.abs(itemPrice - basePrice) / basePrice : 1;
      const score =
        (item.category === product.category ? weights.category : 0) +
        overlapScore(item.collections ?? [item.collection].filter(Boolean), product.collections ?? [product.collection].filter(Boolean), weights.collection) +
        overlapScore(item.tags ?? [], product.tags ?? [], weights.tag) +
        (item.bestSeller ? weights.bestSeller : 0) +
        (item.newArrival ? 1 : 0) +
        (item.stock > 0 ? 3 : -10) +
        Math.max(0, 3 - priceDistance * 3);

      return { item, score };
    })
    .sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name) || a.item.id.localeCompare(b.item.id))
    .map(({ item }) => item);

  return [...manual, ...ranked].slice(0, limit);
}
