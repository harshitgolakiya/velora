function Pulse({ className }: { className: string }) {
  return <div aria-hidden className={`animate-pulse bg-[var(--card)] ${className}`} />;
}

export function CheckoutRouteLoading() {
  return (
    <section className="storefront-container py-8 sm:py-10" aria-label="Loading checkout" aria-busy="true">
      <Pulse className="h-4 w-32" />
      <Pulse className="mt-5 h-11 w-64" />
      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-5">
          {[1, 2, 3].map((item) => <Pulse key={item} className="h-44 w-full" />)}
        </div>
        <Pulse className="h-[460px] w-full" />
      </div>
    </section>
  );
}

export function AccountRouteLoading({ detail = false }: { detail?: boolean }) {
  return (
    <section className="storefront-container py-10 sm:py-12" aria-label="Loading account" aria-busy="true">
      <Pulse className="h-3 w-28" />
      <Pulse className="mt-4 h-11 w-72 max-w-full" />
      <Pulse className="mt-4 h-4 w-full max-w-lg" />
      {detail ? (
        <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-5"><Pulse className="h-52 w-full" /><Pulse className="h-72 w-full" /></div>
          <Pulse className="h-80 w-full" />
        </div>
      ) : (
        <div className="mt-9">
          <Pulse className="h-14 w-full" />
          <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-5"><Pulse className="h-60 w-full" /><Pulse className="h-44 w-full" /></div>
            <Pulse className="h-80 w-full" />
          </div>
        </div>
      )}
    </section>
  );
}
