import "server-only";

import { prisma } from "./prisma";
import type { StoreSearchResults } from "./store-search";

function normalizeSearchQuery(query: string) {
  return query
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .slice(0, 100);
}

export type SearchClickResultType = "product" | "category" | "collection" | "page";
export type SearchAttributionInput = {
  query: string;
  source: "predictive" | "results_page";
  resultType?: SearchClickResultType;
  resultId?: string;
  href?: string;
};

export async function recordSearchEvent({
  query,
  results,
  source,
}: {
  query: string;
  results: StoreSearchResults;
  source: "predictive" | "results_page";
}) {
  const normalizedQuery = normalizeSearchQuery(query);
  if (normalizedQuery.length < 2) return;

  const productCount = results.products.length;
  const categoryCount = results.categories.length;
  const collectionCount = results.collections.length;
  const pageCount = results.pages.length;

  try {
    await prisma.searchEvent.create({
      data: {
        query: query.trim().slice(0, 100),
        normalizedQuery,
        source,
        productCount,
        categoryCount,
        collectionCount,
        pageCount,
        zeroResults: productCount + categoryCount + collectionCount + pageCount === 0,
      },
    });
  } catch {
    // Search analytics must never block search results.
  }
}

export async function recordSearchClickEvent({
  query,
  source,
  resultType,
  resultId,
  href,
  position,
}: {
  query: string;
  source: "predictive" | "results_page";
  resultType: SearchClickResultType;
  resultId?: string;
  href: string;
  position?: number;
}) {
  const normalizedQuery = normalizeSearchQuery(query);
  if (normalizedQuery.length < 2) return;

  try {
    await prisma.searchClickEvent.create({
      data: {
        query: query.trim().slice(0, 100),
        normalizedQuery,
        source,
        resultType,
        resultId: resultId?.slice(0, 120),
        href: href.slice(0, 240),
        position: Number.isFinite(position) ? position : undefined,
      },
    });
  } catch {
    // Search analytics must never block navigation.
  }
}

export async function recordSearchConversionEvent({
  attribution,
  orderId,
  conversionValue,
}: {
  attribution?: SearchAttributionInput | null;
  orderId: string;
  conversionValue?: number;
}) {
  if (!attribution) return;
  const normalizedQuery = normalizeSearchQuery(attribution.query);
  if (normalizedQuery.length < 2) return;

  try {
    await prisma.searchConversionEvent.upsert({
      where: { orderId },
      create: {
        query: attribution.query.trim().slice(0, 100),
        normalizedQuery,
        source: attribution.source,
        resultType: attribution.resultType,
        resultId: attribution.resultId?.slice(0, 120),
        href: attribution.href?.slice(0, 240),
        orderId,
        conversionValue,
      },
      update: {
        query: attribution.query.trim().slice(0, 100),
        normalizedQuery,
        source: attribution.source,
        resultType: attribution.resultType,
        resultId: attribution.resultId?.slice(0, 120),
        href: attribution.href?.slice(0, 240),
        conversionValue,
      },
    });
  } catch {
    // Search conversion analytics must never block checkout.
  }
}
