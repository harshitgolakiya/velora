import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/store/breadcrumbs";
import { SearchResultLink } from "@/components/store/search-result-link";
import { ShopControls } from "@/components/store/shop-controls";
import { compactProductsForList } from "@/lib/catalog-performance";
import { getCmsCategories, getCmsCollections, getCmsProducts } from "@/lib/cms";
import { localizedAlternates } from "@/lib/seo";
import { recordSearchEvent } from "@/lib/search-analytics";
import { getSearchRedirect } from "@/lib/search-merchandising";
import { getSearchMerchandisingSettings } from "@/lib/search-merchandising-store";
import { localizedSearchablePages, searchStore, suggestSearchQuery } from "@/lib/store-search";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { localizedPath, searchCopy, type Locale } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Search",
  description: "Search products, categories, collections, colors, and materials.",
  alternates: localizedAlternates("/search"),
  robots: { index: false, follow: true },
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const query = (await searchParams).q?.trim() ?? "";
  const locale = ((await headers()).get("x-velora-locale") === "ar" ? "ar" : "en") satisfies Locale;
  const copy = searchCopy[locale];
  const localize = (href: string) => localizedPath(href, locale);
  const [products, categories, collections, merchandisingSettings] = await Promise.all([
    getCmsProducts(),
    getCmsCategories(),
    getCmsCollections(),
    getSearchMerchandisingSettings(),
  ]);
  const searchRedirect = getSearchRedirect(query, merchandisingSettings);
  if (query && searchRedirect) redirect(localize(searchRedirect));
  const results = searchStore(query, products, categories, collections, localizedSearchablePages(locale), merchandisingSettings);
  const suggestedQuery = results.products.length ? undefined : suggestSearchQuery(query, products, categories, collections);
  await recordSearchEvent({ query, results, source: "results_page" });

  return (
    <main className="storefront-container py-8 sm:py-10">
      <Breadcrumbs items={[{ label: copy.search }]} />
      <header className="mb-6 border-b border-[var(--border)] pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">{copy.search}</p>
        <h1 className="mt-3 text-3xl font-medium leading-tight sm:text-5xl">
          {query ? `${copy.resultsFor} “${query}”` : copy.discover}
        </h1>
        <p className="mt-3 text-sm text-[var(--muted)]">
          {results.products.length} {results.products.length === 1 ? copy.product : copy.productsFound}
        </p>
      </header>

      {query && (results.categories.length || results.collections.length || results.pages.length) ? (
        <section className="mb-6 border-b border-[var(--border)] pb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">{copy.relatedDestinations}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {results.categories.map((category, index) => (
              <SearchResultLink
                key={category}
                href={localize(`/shop?category=${encodeURIComponent(category)}`)}
                query={query}
                resultType="category"
                resultId={category}
                position={index}
                className="storefront-action inline-flex min-h-10 items-center border border-[var(--border)] px-3 text-sm hover:bg-[var(--hover)]"
              >
                {category}
              </SearchResultLink>
            ))}
            {results.collections.map((collection, index) => (
              <SearchResultLink
                key={collection.slug}
                href={localize(`/collections/${collection.slug}`)}
                query={query}
                resultType="collection"
                resultId={collection.slug}
                position={index}
                className="storefront-action inline-flex min-h-10 items-center border border-[var(--border)] px-3 text-sm hover:bg-[var(--hover)]"
              >
                {collection.name}
              </SearchResultLink>
            ))}
            {results.pages.map((page, index) => (
              <SearchResultLink
                key={page.href}
                href={localize(page.href)}
                query={query}
                resultType="page"
                resultId={page.href}
                position={index}
                className="storefront-action inline-flex min-h-10 items-center border border-[var(--border)] px-3 text-sm hover:bg-[var(--hover)]"
              >
                {page.title}
              </SearchResultLink>
            ))}
          </div>
        </section>
      ) : null}

      {results.products.length ? (
        <ShopControls products={compactProductsForList(results.products)} categories={categories} collections={collections} preserveParams={["q"]} />
      ) : (
        <section className="storefront-railed px-5 py-14 text-center sm:px-6">
          <h2 className="text-3xl font-medium">{copy.noProducts}</h2>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[var(--muted)]">
            {copy.noProductsBody}
          </p>
          {suggestedQuery ? (
            <Link href={localize(`/search?q=${encodeURIComponent(suggestedQuery)}`)} className="storefront-action mt-5 inline-flex min-h-10 items-center font-semibold underline underline-offset-4">
              {copy.didYouMean} “{suggestedQuery}”?
            </Link>
          ) : null}
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            {categories.slice(0, 5).map((category, index) => (
              <SearchResultLink
                key={category}
                href={localize(`/shop?category=${encodeURIComponent(category)}`)}
                query={query}
                resultType="category"
                resultId={category}
                position={index}
                className="storefront-action inline-flex min-h-10 items-center border border-[var(--border)] px-4 text-sm hover:bg-[var(--hover)]"
              >
                {category}
              </SearchResultLink>
            ))}
            <Link href={localize("/shop")} className="storefront-action inline-flex min-h-10 items-center bg-[var(--foreground)] px-5 text-sm text-[var(--background)]">
              {copy.shopAll}
            </Link>
            {results.pages.slice(0, 3).map((page, index) => (
              <SearchResultLink
                key={page.href}
                href={localize(page.href)}
                query={query}
                resultType="page"
                resultId={page.href}
                position={index}
                className="storefront-action inline-flex min-h-10 items-center border border-[var(--border)] px-4 text-sm hover:bg-[var(--hover)]"
              >
                {page.title}
              </SearchResultLink>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
