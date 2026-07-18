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
import { searchStore } from "@/lib/store-search";
import { redirect } from "next/navigation";

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
  const [products, categories, collections, merchandisingSettings] = await Promise.all([
    getCmsProducts(),
    getCmsCategories(),
    getCmsCollections(),
    getSearchMerchandisingSettings(),
  ]);
  const searchRedirect = getSearchRedirect(query, merchandisingSettings);
  if (query && searchRedirect) redirect(searchRedirect);
  const results = searchStore(query, products, categories, collections, undefined, merchandisingSettings);
  await recordSearchEvent({ query, results, source: "results_page" });

  return (
    <main className="mx-auto max-w-[1440px] px-4 py-12 sm:px-6 lg:px-8">
      <Breadcrumbs items={[{ label: "Search" }]} />
      <header className="mb-10 border-b border-[var(--border)] pb-10">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">Search</p>
        <h1 className="mt-4 text-4xl font-medium sm:text-6xl">
          {query ? `Results for “${query}”` : "Discover the collection"}
        </h1>
        <p className="mt-4 text-[var(--muted)]">
          {results.products.length} {results.products.length === 1 ? "product" : "products"} found
        </p>
      </header>

      {query && (results.categories.length || results.collections.length || results.pages.length) ? (
        <section className="mb-10 border-b border-[var(--border)] pb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Related destinations</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {results.categories.map((category, index) => (
              <SearchResultLink
                key={category}
                href={`/shop?category=${encodeURIComponent(category)}`}
                query={query}
                resultType="category"
                resultId={category}
                position={index}
                className="border border-[var(--border)] px-4 py-2 text-sm hover:bg-[var(--hover)]"
              >
                {category}
              </SearchResultLink>
            ))}
            {results.collections.map((collection, index) => (
              <SearchResultLink
                key={collection.slug}
                href={`/collections/${collection.slug}`}
                query={query}
                resultType="collection"
                resultId={collection.slug}
                position={index}
                className="border border-[var(--border)] px-4 py-2 text-sm hover:bg-[var(--hover)]"
              >
                {collection.name}
              </SearchResultLink>
            ))}
            {results.pages.map((page, index) => (
              <SearchResultLink
                key={page.href}
                href={page.href}
                query={query}
                resultType="page"
                resultId={page.href}
                position={index}
                className="border border-[var(--border)] px-4 py-2 text-sm hover:bg-[var(--hover)]"
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
        <section className="border-y border-[var(--border)] py-20 text-center">
          <h2 className="text-3xl font-medium">No products found</h2>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[var(--muted)]">
            Try a shorter product name, a color, a category such as Leggings, or browse the complete collection.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            {categories.slice(0, 5).map((category, index) => (
              <SearchResultLink
                key={category}
                href={`/shop?category=${encodeURIComponent(category)}`}
                query={query}
                resultType="category"
                resultId={category}
                position={index}
                className="border border-[var(--border)] px-4 py-2 text-sm"
              >
                {category}
              </SearchResultLink>
            ))}
            <Link href="/shop" className="bg-[var(--foreground)] px-5 py-2 text-sm text-[var(--background)]">
              Shop all
            </Link>
            {results.pages.slice(0, 3).map((page, index) => (
              <SearchResultLink
                key={page.href}
                href={page.href}
                query={query}
                resultType="page"
                resultId={page.href}
                position={index}
                className="border border-[var(--border)] px-4 py-2 text-sm"
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
