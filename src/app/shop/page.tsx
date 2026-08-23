import type { Metadata } from "next";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/store/breadcrumbs";
import { PageHeader } from "@/components/store/page-header";
import { ShopControls } from "@/components/store/shop-controls";
import { compactProductsForList } from "@/lib/catalog-performance";
import { getCmsCategories, getCmsCategoryDetails, getCmsCollections, getCmsProducts } from "@/lib/cms";
import { localizedAlternates } from "@/lib/seo";
import { requestLocale } from "@/lib/cms";
import { catalogCopy } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Shop",
  description: "Shop Velora premium sports bras, leggings, jackets, tops, and active essentials in AED.",
  alternates: localizedAlternates("/shop"),
  openGraph: {
    title: "Shop Velora",
    description: "Shop Velora premium sports bras, leggings, jackets, tops, and active essentials in AED.",
    url: "/shop",
    type: "website",
  },
};

export default async function ShopPage() {
  const [products, categories, categoryDetails, collections, locale] = await Promise.all([
    getCmsProducts(),
    getCmsCategories(),
    getCmsCategoryDetails(),
    getCmsCollections(),
    requestLocale(),
  ]);
  const copy = catalogCopy[locale];

  return (
    <section className="storefront-container pb-12 pt-7 sm:pt-8">
      <Breadcrumbs items={[{ label: copy.shop }]} />
      <PageHeader
        eyebrow={copy.shop}
        title={copy.shopTitle}
        description={copy.shopDescription}
      />
      <Suspense fallback={<div className="py-20 text-center text-[var(--muted)]">{copy.loadingProducts}</div>}>
        <ShopControls products={compactProductsForList(products)} categories={categories} categoryDetails={categoryDetails} collections={collections} />
      </Suspense>
    </section>
  );
}
