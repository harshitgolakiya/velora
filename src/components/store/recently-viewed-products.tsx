"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight, Clock3 } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import type { Product } from "@/lib/catalog";
import { ProductCard } from "./product-card";
import { useLocalizedHref } from "@/lib/use-localized-href";

const storageKey = "velora-recently-viewed";

export function RecentlyViewedProducts({
  current,
  products,
}: {
  current: string;
  products: Product[];
}) {
  const localize = useLocalizedHref();
  const [recentSlugs, setRecentSlugs] = useState<string[]>([]);
  const [viewportRef, carousel] = useEmblaCarousel({ align: "start", containScroll: "trimSnaps" });
  const [canPrevious, setCanPrevious] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const updateControls = useCallback(() => {
    if (!carousel) return;
    setCanPrevious(carousel.canScrollPrev());
    setCanNext(carousel.canScrollNext());
  }, [carousel]);

  useEffect(() => {
    if (!carousel) return;
    const frame = window.requestAnimationFrame(updateControls);
    carousel.on("select", updateControls).on("reInit", updateControls);
    return () => {
      window.cancelAnimationFrame(frame);
      carousel.off("select", updateControls).off("reInit", updateControls);
    };
  }, [carousel, updateControls]);

  useEffect(() => {
    let previous: string[] = [];
    try {
      previous = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
    } catch {
      previous = [];
    }
    const timer = window.setTimeout(() => {
      setRecentSlugs(previous.filter((slug) => slug !== current).slice(0, 8));
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
      <div className="grid gap-5 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
            <Clock3 className="size-3.5 text-[var(--accent)]" />
            Your edit
          </p>
          <h2 className="mt-2 text-3xl font-medium">Recently viewed</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--muted)]">
            Pick up where you left off, with the same color controls and saved preferences.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" aria-label="Previous recently viewed products" disabled={!canPrevious} onClick={() => carousel?.scrollPrev()} className="storefront-action grid size-11 place-items-center border border-[var(--border)] disabled:opacity-35"><ChevronLeft className="size-4" /></button>
          <button type="button" aria-label="Next recently viewed products" disabled={!canNext} onClick={() => carousel?.scrollNext()} className="storefront-action grid size-11 place-items-center border border-[var(--border)] disabled:opacity-35"><ChevronRight className="size-4" /></button>
          <Link href={localize("/shop")} className="storefront-action inline-flex h-11 w-fit items-center gap-2 border border-[var(--border)] px-4 text-xs font-semibold uppercase tracking-[0.12em] hover:border-[var(--foreground)]">
            Continue shopping
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
      <div ref={viewportRef} className="mt-8 overflow-hidden">
        <div className="flex gap-4">
          {recent.map((product) => (
            <div key={product.id} className="min-w-0 shrink-0 basis-[78vw] sm:basis-[calc((100%_-_16px)/2)] lg:basis-[calc((100%_-_64px)/5)]">
              <ProductCard
                product={product}
                imageSizes="(min-width: 1024px) 20vw, (min-width: 640px) 50vw, 78vw"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
