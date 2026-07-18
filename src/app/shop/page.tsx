import type { Metadata } from "next";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/store/breadcrumbs";
import { PageHeader } from "@/components/store/page-header";
import { ShopControls } from "@/components/store/shop-controls";
import { compactProductsForList } from "@/lib/catalog-performance";
import { getCmsCategories, getCmsCategoryDetails, getCmsCollections, getCmsProducts } from "@/lib/cms";
import { localizedAlternates } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Shop",
  description: "Shop Velora leggings, bras, jackets, tops, pants, and accessories in AED.",
  alternates: localizedAlternates("/shop"),
  openGraph: {
    title: "Shop Velora",
    description: "Shop Velora leggings, bras, jackets, tops, pants, and accessories in AED.",
    url: "/shop",
    type: "website",
  },
};

export default async function ShopPage() {
  const [products, categories, categoryDetails, collections] = await Promise.all([
    getCmsProducts(),
    getCmsCategories(),
    getCmsCategoryDetails(),
    getCmsCollections(),
  ]);

  return (
    <section className="mx-auto max-w-[1440px] px-4 pb-12 pt-9 sm:px-6 sm:pt-10 lg:px-8">
      <Breadcrumbs items={[{ label: "Shop" }]} />
      <PageHeader
        eyebrow="Shop"
        title="All activewear"
        description="Explore the current collection by category, size, color, material, and availability."
      />
      <Suspense fallback={<div className="py-20 text-center text-[var(--muted)]">Loading products...</div>}>
        <ShopControls products={compactProductsForList(products)} categories={categories} categoryDetails={categoryDetails} collections={collections} />
      </Suspense>
    </section>
  );
}
