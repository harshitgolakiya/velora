"use client";

import { useEffect, useState } from "react";
import type { Product } from "@/lib/catalog";
import { ProductCard } from "./product-card";

const storageKey = "velora-recently-viewed";

export function RecentlyViewedProducts({
  current,
  products,
}: {
  current: string;
  products: Product[];
}) {
  const [recentSlugs, setRecentSlugs] = useState<string[]>([]);

  useEffect(() => {
    let previous: string[] = [];
    try {
      previous = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
    } catch {
      previous = [];
    }
    const timer = window.setTimeout(() => {
      setRecentSlugs(previous.filter((slug) => slug !== current).slice(0, 4));
    }, 0);
    localStorage.setItem(
      storageKey,
      JSON.stringify([current, ...previous.filter((slug) => slug !== current)].slice(0, 8)),
    );
    return () => window.clearTimeout(timer);
  }, [current]);

  const recent = recentSlugs
    .map((slug) => products.find((product) => product.slug === slug))
    .filter((product): product is Product => Boolean(product));

  if (!recent.length) return null;

  return (
    <section className="mt-20 border-t border-[var(--border)] pt-14">
      <div className="flex items-end justify-between gap-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
            Your edit
          </p>
          <h2 className="mt-2 text-3xl font-medium">Recently viewed</h2>
        </div>
      </div>
      <div className="mt-8 grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
        {recent.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            imageSizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
          />
        ))}
      </div>
    </section>
  );
}
