"use client";

import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { catalogCopy, localeFromPathname } from "@/lib/i18n";
import { useLocalizedHref } from "@/lib/use-localized-href";

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
  const locale = localeFromPathname(usePathname());
  const copy = catalogCopy[locale];
  const localize = useLocalizedHref();
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    direction: locale === "ar" ? "rtl" : "ltr",
    containScroll: "trimSnaps",
    dragFree: false,
    skipSnaps: false,
  });
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const [progress, setProgress] = useState(0);

  const updateScrollState = useCallback(() => {
    if (!emblaApi) return;
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
    setProgress(Math.max(0, Math.min(1, emblaApi.scrollProgress())));
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    const frame = window.requestAnimationFrame(updateScrollState);
    emblaApi
      .on("select", updateScrollState)
      .on("scroll", updateScrollState)
      .on("reInit", updateScrollState);
    return () => {
      window.cancelAnimationFrame(frame);
      emblaApi
        .off("select", updateScrollState)
        .off("scroll", updateScrollState)
        .off("reInit", updateScrollState);
    };
  }, [emblaApi, updateScrollState]);

  useEffect(() => {
    if (!emblaApi) return;
    const frame = window.requestAnimationFrame(() => {
      emblaApi.reInit();
      updateScrollState();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [children, emblaApi, updateScrollState]);

  function scrollProducts(direction: -1 | 1) {
    if (!emblaApi) return;
    if (direction < 0) emblaApi.scrollPrev();
    else emblaApi.scrollNext();
  }

  return (
    <div>
      <div className="mb-10 border-t border-[var(--border)] pt-6 sm:mb-14 sm:pt-7">
        <div className="flex items-center justify-between gap-6">
          {subtitle ? (
            <p className="text-[10px] font-semibold uppercase leading-none tracking-[0.22em] text-[var(--muted)]">{subtitle}</p>
          ) : null}
          <Link href={localize(ctaHref)} className="storefront-action inline-flex min-h-10 items-center gap-2 text-xs font-semibold uppercase leading-none tracking-[0.14em]">
            {ctaLabel} <ArrowRight className={`size-4 ${locale === "ar" ? "rotate-180" : ""}`} />
          </Link>
        </div>
        <div className="mt-4 grid gap-6 pb-2 sm:mt-5 sm:pb-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-8">
          <h2 className="min-w-0 break-words pb-1 font-serif text-4xl leading-[1.08] sm:text-6xl sm:leading-[1.06]">{title}</h2>
          <div className="flex shrink-0 justify-end gap-2">
            <button
              type="button"
              aria-label={copy.previousProducts}
              onClick={() => scrollProducts(-1)}
              disabled={!canScrollPrev}
              className="storefront-action grid size-11 place-items-center bg-[var(--surface)] text-[var(--foreground)] shadow-sm ring-1 ring-[var(--border)] transition hover:bg-[var(--hover)] disabled:cursor-default disabled:opacity-35 motion-reduce:transition-none"
            >
              {locale === "ar" ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
            </button>
            <button
              type="button"
              aria-label={copy.nextProducts}
              onClick={() => scrollProducts(1)}
              disabled={!canScrollNext}
              className="storefront-action grid size-11 place-items-center bg-[var(--surface)] text-[var(--foreground)] shadow-sm ring-1 ring-[var(--border)] transition hover:bg-[var(--hover)] disabled:cursor-default disabled:opacity-35 motion-reduce:transition-none"
            >
              {locale === "ar" ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
            </button>
          </div>
        </div>
      </div>
      <div
        ref={emblaRef}
        className="homepage-product-grid overflow-hidden"
        data-testid="product-carousel-viewport"
      >
        <div className="homepage-product-track flex cursor-grab gap-4 active:cursor-grabbing">
          {children}
        </div>
      </div>
      <div className="mt-5 h-px bg-[var(--border)]" aria-hidden="true">
        <div
          className="h-px bg-[var(--foreground)] transition-[width] duration-300"
          style={{ width: `${Math.max(0.18, progress) * 100}%`, marginInlineStart: 0 }}
        />
      </div>
    </div>
  );
}
