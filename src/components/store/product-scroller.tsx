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
  body,
  ctaHref,
  ctaLabel,
  children,
}: {
  title: string;
  subtitle?: string;
  body?: string;
  ctaHref: string;
  ctaLabel: string;
  children: ReactNode;
}) {
  const locale = localeFromPathname(usePathname());
  const copy = catalogCopy[locale];
  const localize = useLocalizedHref();
  const rtl = locale === "ar";
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    direction: rtl ? "rtl" : "ltr",
    containScroll: "trimSnaps",
    dragFree: true,
    duration: 24,
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
    emblaApi.on("select", updateScrollState).on("scroll", updateScrollState).on("reInit", updateScrollState);
    return () => {
      window.cancelAnimationFrame(frame);
      emblaApi.off("select", updateScrollState).off("scroll", updateScrollState).off("reInit", updateScrollState);
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

  const PrevIcon = rtl ? ChevronRight : ChevronLeft;
  const NextIcon = rtl ? ChevronLeft : ChevronRight;

  return (
    <div>
      <div className="section-head">
        <div className="max-w-2xl">
          {subtitle ? <p className="eyebrow">{subtitle}</p> : null}
          <h2 className="display-lg mt-3">{title}</h2>
          {body ? <p className="mt-4 max-w-xl text-[15px] leading-7 text-[var(--muted)]">{body}</p> : null}
        </div>
        <div className="flex items-center gap-3">
          <Link href={localize(ctaHref)} className="btn btn-link btn-sm me-2">
            {ctaLabel} <ArrowRight className="size-4 rtl:rotate-180" />
          </Link>
          <button type="button" aria-label={copy.previousProducts} onClick={() => emblaApi?.scrollPrev()} disabled={!canScrollPrev} className="btn btn-soft btn-icon btn-round">
            <PrevIcon className="size-4" />
          </button>
          <button type="button" aria-label={copy.nextProducts} onClick={() => emblaApi?.scrollNext()} disabled={!canScrollNext} className="btn btn-soft btn-icon btn-round">
            <NextIcon className="size-4" />
          </button>
        </div>
      </div>
      <div ref={emblaRef} className="homepage-product-grid overflow-hidden" data-testid="product-carousel-viewport">
        <div className="homepage-product-track flex cursor-grab gap-4 active:cursor-grabbing">{children}</div>
      </div>
      <div className="mt-6 h-px bg-[var(--border)]" aria-hidden="true">
        <div className="h-px bg-[var(--foreground)] transition-[width] duration-300" style={{ width: `${Math.max(0.18, progress) * 100}%` }} />
      </div>
    </div>
  );
}
