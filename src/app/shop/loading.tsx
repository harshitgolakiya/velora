import { ProductGridSkeleton } from "@/components/store/product-grid-skeleton";

export default function ShopLoading() {
  return (
    <section className="mx-auto max-w-[1440px] px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-6 h-4 w-40 animate-pulse rounded bg-[var(--card)]" />
      <div className="mb-10 max-w-3xl">
        <div className="h-3 w-16 animate-pulse rounded bg-[var(--card)]" />
        <div className="mt-4 h-12 w-64 animate-pulse rounded bg-[var(--card)]" />
        <div className="mt-4 h-4 w-full max-w-xl animate-pulse rounded bg-[var(--card)]" />
      </div>
      <div className="mb-8 h-12 w-full animate-pulse rounded bg-[var(--card)]" />
      <ProductGridSkeleton />
    </section>
  );
}
