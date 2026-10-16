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
        <section className="storefront-container flex min-h-dvh flex-col items-center justify-center py-20 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">Unexpected error</p>
          <h1 className="mt-4 font-serif text-5xl sm:text-6xl">Velora hit a snag.</h1>
          <p className="mt-4 max-w-md text-[var(--muted)]">
            Something went wrong while loading the site. Please try again.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="btn btn-primary mt-8"
          >
            Try again
          </button>
        </section>
      </body>
    </html>
  );
}
