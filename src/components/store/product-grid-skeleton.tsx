export function ProductGridSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div className="grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-5" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="min-w-0">
          <div className="aspect-[3/4] animate-pulse bg-[var(--card)]" />
          <div className="mt-4 flex gap-2">
            <div className="size-3.5 animate-pulse bg-[var(--card)]" />
            <div className="size-3.5 animate-pulse bg-[var(--card)]" />
          </div>
          <div className="mt-4 flex justify-between gap-5">
            <div className="min-w-0 flex-1">
              <div className="h-4 w-3/4 animate-pulse bg-[var(--card)]" />
              <div className="mt-2 h-3 w-1/2 animate-pulse bg-[var(--card)]" />
            </div>
            <div className="h-4 w-14 animate-pulse bg-[var(--card)]" />
          </div>
        </div>
      ))}
    </div>
  );
}
