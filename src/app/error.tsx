"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="mx-auto flex min-h-[60dvh] max-w-[1440px] flex-col items-center justify-center px-4 py-20 text-center sm:px-6 lg:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">Something went wrong</p>
      <h1 className="mt-4 font-serif text-5xl sm:text-6xl">We hit a snag.</h1>
      <p className="mt-4 max-w-md text-[var(--muted)]">
        This page failed to load. You can try again, or head back to the homepage and continue browsing.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex h-11 items-center justify-center bg-[var(--accent)] px-6 text-sm font-medium text-[var(--background)] transition hover:bg-[var(--foreground)] hover:text-[var(--background)] motion-reduce:transition-none"
        >
          Try again
        </button>
        <Link
          href="/"
          className="inline-flex h-11 items-center justify-center border border-[var(--border)] px-6 text-sm font-medium transition hover:border-[var(--accent)] motion-reduce:transition-none"
        >
          Back to homepage
        </Link>
      </div>
    </section>
  );
}
