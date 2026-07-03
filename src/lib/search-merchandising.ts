import { z } from "zod";
import type { Product } from "./catalog";

export const searchMerchandisingSettingsSchema = z.object({
  synonyms: z.record(z.string().min(1), z.array(z.string().min(1)).max(12)).default({}),
  redirects: z.record(z.string().min(1), z.string().min(1).max(240)).default({}),
  pinnedProducts: z.record(z.string().min(1), z.array(z.string().min(1)).max(12)).default({}),
  boostedProducts: z.record(z.string().min(1), z.array(z.string().min(1)).max(24)).default({}),
  buriedProducts: z.record(z.string().min(1), z.array(z.string().min(1)).max(24)).default({}),
});

export type SearchMerchandisingSettings = z.infer<typeof searchMerchandisingSettingsSchema>;

export const defaultSearchMerchandisingSettings: SearchMerchandisingSettings = {
  synonyms: {},
  redirects: {},
  pinnedProducts: {},
  boostedProducts: {},
  buriedProducts: {},
};

export function normalizeMerchandisingQuery(query: string) {
  return query
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizedLookup<T>(record: Record<string, T>, query: string): T | undefined {
  const normalized = normalizeMerchandisingQuery(query);
  const entry = Object.entries(record).find(([key]) => normalizeMerchandisingQuery(key) === normalized);
  return entry?.[1];
}

export function parseSearchMerchandisingSettings(value: string | null | undefined): SearchMerchandisingSettings {
  if (!value) return defaultSearchMerchandisingSettings;
  try {
    const parsed = searchMerchandisingSettingsSchema.partial().safeParse(JSON.parse(value));
    return parsed.success ? { ...defaultSearchMerchandisingSettings, ...parsed.data } : defaultSearchMerchandisingSettings;
  } catch {
    return defaultSearchMerchandisingSettings;
  }
}

export function getSearchRedirect(query: string, settings: SearchMerchandisingSettings) {
  return normalizedLookup(settings.redirects, query);
}

export function searchQueryVariants(query: string, settings: SearchMerchandisingSettings) {
  const synonyms = normalizedLookup(settings.synonyms, query) ?? [];
  return Array.from(new Set([query, ...synonyms].map((item) => item.trim()).filter(Boolean)));
}

export function applyProductMerchandising(
  query: string,
  rankedProducts: Array<{ product: Product; score: number }>,
  allProducts: Product[],
  settings: SearchMerchandisingSettings,
) {
  const pinned = normalizedLookup(settings.pinnedProducts, query) ?? [];
  const boosted = new Set(normalizedLookup(settings.boostedProducts, query) ?? []);
  const buried = new Set(normalizedLookup(settings.buriedProducts, query) ?? []);
  const byId = new Map(rankedProducts.map((entry) => [entry.product.id, entry]));
  const allById = new Map(allProducts.map((product) => [product.id, product]));

  for (const productId of pinned) {
    const existing = byId.get(productId);
    if (existing) existing.score += 10_000;
    else {
      const product = allById.get(productId);
      if (product) {
        const entry = { product, score: 10_000 };
        rankedProducts.push(entry);
        byId.set(productId, entry);
      }
    }
  }

  return rankedProducts
    .map((entry) => {
      const pinIndex = pinned.indexOf(entry.product.id);
      return {
        ...entry,
        pinIndex,
        score:
          entry.score +
          (boosted.has(entry.product.id) ? 250 : 0) -
          (buried.has(entry.product.id) ? 250 : 0),
      };
    })
    .sort((a, b) => {
      if (a.pinIndex >= 0 || b.pinIndex >= 0) {
        if (a.pinIndex < 0) return 1;
        if (b.pinIndex < 0) return -1;
        return a.pinIndex - b.pinIndex;
      }
      return b.score - a.score || a.product.name.localeCompare(b.product.name);
    });
}
