"use client";

import { useEffect } from "react";
import "./globals.css";

export default function GlobalError({
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
    <html lang="en">
      <body className="antialiased">
        <section className="mx-auto flex min-h-dvh max-w-[1440px] flex-col items-center justify-center px-4 py-20 text-center sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">Unexpected error</p>
          <h1 className="mt-4 font-serif text-5xl sm:text-6xl">Velora hit a snag.</h1>
          <p className="mt-4 max-w-md text-[var(--muted)]">
            Something went wrong while loading the site. Please try again.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="mt-8 inline-flex h-11 items-center justify-center bg-[var(--accent)] px-6 text-sm font-medium text-[var(--background)] transition hover:bg-[var(--foreground)] hover:text-[var(--background)] motion-reduce:transition-none"
          >
            Try again
          </button>
        </section>
      </body>
    </html>
  );
}
