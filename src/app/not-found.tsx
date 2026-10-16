import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";

export default function NotFound() {
  return (
    <main className="page-transition storefront-container-narrow flex min-h-[70svh] items-center py-14">
      <section className="storefront-railed grid w-full gap-10 px-5 py-12 sm:px-6 lg:grid-cols-[0.72fr_1.28fr] lg:py-16">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--accent-text)]">404</p>
          <h1 className="mt-4 text-4xl font-medium leading-[1.03] sm:text-6xl">This page is not available.</h1>
        </div>
        <div className="max-w-2xl">
          <p className="text-sm leading-7 text-[var(--muted)] sm:text-base">
            The link may have moved, or the product may no longer be published. Search the collection or return to the shop.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/shop"
              className="btn btn-primary"
            >
              Shop all
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/search"
              className="btn btn-secondary"
            >
              <Search className="size-4" />
              Search
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
