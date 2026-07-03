import { ProductGridSkeleton } from "@/components/store/product-grid-skeleton";

export default function CollectionLoading() {
  return (
    <section className="mx-auto max-w-[1440px] px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-6 h-4 w-40 animate-pulse bg-[var(--card)]" />
      <div className="mb-10 max-w-3xl">
        <div className="h-12 w-72 animate-pulse bg-[var(--card)]" />
        <div className="mt-4 h-4 w-full max-w-xl animate-pulse bg-[var(--card)]" />
      </div>
      <div className="mb-8 h-14 w-full animate-pulse bg-[var(--card)]" />
      <ProductGridSkeleton />
    </section>
  );
}
