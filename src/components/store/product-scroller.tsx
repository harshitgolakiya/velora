"use client";

import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";

export function ProductScroller({
  title,
  subtitle,
  ctaHref,
  ctaLabel,
  children,
}: {
  title: string;
  subtitle?: string;
  ctaHref: string;
  ctaLabel: string;
  children: ReactNode;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const [progress, setProgress] = useState(0);

  function updateScrollState() {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const maxScroll = viewport.scrollWidth - viewport.clientWidth;
    setCanScrollPrev(viewport.scrollLeft > 4);
    setCanScrollNext(viewport.scrollLeft < maxScroll - 4);
    setProgress(maxScroll > 0 ? viewport.scrollLeft / maxScroll : 1);
  }

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    updateScrollState();
    viewport.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);
    return () => {
      viewport.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, []);

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
              disabled={!canScrollPrev}
              className="storefront-action grid size-10 place-items-center bg-[var(--surface)] text-[var(--foreground)] shadow-sm ring-1 ring-[var(--border)] transition hover:bg-[var(--hover)] disabled:cursor-default disabled:opacity-35 motion-reduce:transition-none"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              aria-label="Next products"
              onClick={() => scrollProducts(1)}
              disabled={!canScrollNext}
              className="storefront-action grid size-10 place-items-center bg-[var(--surface)] text-[var(--foreground)] shadow-sm ring-1 ring-[var(--border)] transition hover:bg-[var(--hover)] disabled:cursor-default disabled:opacity-35 motion-reduce:transition-none"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </div>
      <div ref={viewportRef} className="homepage-product-grid overflow-x-auto scroll-smooth" data-testid="product-carousel-viewport">
        <div className="homepage-product-track flex snap-x snap-mandatory gap-4">
          {children}
        </div>
      </div>
      <div className="mt-5 h-px bg-[var(--border)]" aria-hidden="true">
        <div
          className="h-px bg-[var(--foreground)] transition-[width] duration-300"
          style={{ width: `${Math.max(0.18, progress) * 100}%` }}
        />
      </div>
    </div>
  );
}
