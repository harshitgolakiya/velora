export default function ProductLoading() {
  return (
    <section className="storefront-container-narrow py-10">
      <div className="mb-6 h-4 w-56 animate-pulse bg-[var(--card)]" />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,0.92fr)_minmax(410px,0.78fr)] lg:gap-9 xl:grid-cols-[minmax(0,620px)_minmax(420px,1fr)] xl:gap-12">
        <div className="storefront-product-media aspect-square max-w-[620px] animate-pulse bg-[var(--card)]" />
        <div className="min-w-0 max-w-[620px]">
          <div className="h-3 w-24 animate-pulse bg-[var(--card)]" />
          <div className="mt-3 h-10 w-3/4 animate-pulse bg-[var(--card)]" />
          <div className="mt-4 h-4 w-32 animate-pulse bg-[var(--card)]" />
          <div className="mt-5 h-7 w-28 animate-pulse bg-[var(--card)]" />
          <div className="mt-8 h-11 w-full animate-pulse bg-[var(--card)]" />
          <div className="mt-3 h-11 w-full animate-pulse bg-[var(--card)]" />
        </div>
      </div>
    </section>
  );
}
