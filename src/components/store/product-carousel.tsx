"use client";

import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";
import type { Product } from "@/lib/catalog";
import { ProductCard } from "./product-card";

export function ProductCarousel({
  products,
  title,
  subtitle,
  ctaHref,
  ctaLabel,
  priorityCount = 0,
}: {
  products: Product[];
  title: string;
  subtitle?: string;
  ctaHref: string;
  ctaLabel: string;
  priorityCount?: number;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);

  function scrollProducts(direction: -1 | 1) {
    const viewport = viewportRef.current;
    if (!viewport) return;
    viewport.scrollBy({ left: direction * viewport.clientWidth * 0.9, behavior: "smooth" });
  }

  return (
    <div>
      <div className="mb-10 border-t border-[var(--border)] pt-6">
        <div className="flex items-center justify-between gap-6">
          {subtitle ? (
            <p className="text-[10px] font-semibold uppercase leading-none tracking-[0.22em] text-[var(--muted)]">{subtitle}</p>
          ) : null}
          <Link href={ctaHref} className="inline-flex items-center gap-2 text-xs font-semibold uppercase leading-none tracking-[0.14em]">
            {ctaLabel} <ArrowRight className="size-4" />
          </Link>
        </div>
        <div className="mt-3 flex items-start justify-between gap-6">
          <h2 className="font-serif text-4xl leading-none sm:text-6xl">{title}</h2>
          <div className="flex gap-2">
            <button
              type="button"
              aria-label="Previous products"
              onClick={() => scrollProducts(-1)}
              className="grid size-10 place-items-center bg-[var(--surface)] text-[var(--foreground)] shadow-sm ring-1 ring-[var(--border)] transition hover:bg-[var(--hover)] motion-reduce:transition-none"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              aria-label="Next products"
              onClick={() => scrollProducts(1)}
              className="grid size-10 place-items-center bg-[var(--surface)] text-[var(--foreground)] shadow-sm ring-1 ring-[var(--border)] transition hover:bg-[var(--hover)] motion-reduce:transition-none"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </div>
      <div ref={viewportRef} className="homepage-product-grid overflow-x-auto scroll-smooth" data-testid="product-carousel-viewport">
        <div className="homepage-product-track flex snap-x snap-mandatory gap-4">
          {products.map((product, index) => (
            <div
              key={product.id}
              className="homepage-product-slide min-w-0 shrink-0 snap-start"
              style={{ flex: "0 0 var(--homepage-product-slide-basis)" }}
            >
              <ProductCard
                product={product}
                priority={index < priorityCount}
                className="select-none"
                imageSizes="(min-width: 1800px) 260px, (min-width: 1024px) 25vw, (min-width: 640px) 42vw, 78vw"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
