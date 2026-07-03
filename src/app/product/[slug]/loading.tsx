export default function ProductLoading() {
  return (
    <section className="mx-auto max-w-360 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-6 h-4 w-56 animate-pulse bg-[var(--card)]" />
      <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="aspect-[4/5] animate-pulse bg-[var(--card)]" />
        <div>
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
