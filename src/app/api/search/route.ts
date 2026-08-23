import { NextResponse } from "next/server";
import { getCmsCategories, getCmsCollections, getCmsProducts } from "@/lib/cms";
import { recordSearchEvent } from "@/lib/search-analytics";
import { getSearchRedirect } from "@/lib/search-merchandising";
import { getSearchMerchandisingSettings } from "@/lib/search-merchandising-store";
import { localizedSearchablePages, searchStore, suggestSearchQuery } from "@/lib/store-search";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim().slice(0, 100) ?? "";
  const locale = url.searchParams.get("locale") === "ar" ? "ar" : "en";
  const [products, categories, collections, merchandisingSettings] = await Promise.all([
    getCmsProducts(locale),
    getCmsCategories(locale),
    getCmsCollections(locale),
    getSearchMerchandisingSettings(),
  ]);
  const redirect = getSearchRedirect(query, merchandisingSettings);
  const results = searchStore(query, products, categories, collections, localizedSearchablePages(locale), merchandisingSettings);
  const suggestedQuery = results.products.length ? undefined : suggestSearchQuery(query, products, categories, collections);
  await recordSearchEvent({ query, results, source: "predictive" });

  return NextResponse.json({
    query,
    redirect,
    suggestedQuery,
    products: results.products.slice(0, 6).map((product) => ({
      id: product.id,
      slug: product.slug,
      name: product.name,
      category: product.category,
      price: product.salePrice ?? product.price,
      image: product.images[0],
      colors: product.colors.slice(0, 4),
    })),
    categories: results.categories.slice(0, 4),
    collections: results.collections.slice(0, 4),
    pages: results.pages.slice(0, 4),
  });
}
