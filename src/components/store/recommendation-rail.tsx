"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Product } from "@/lib/catalog";
import { ProductCard } from "./product-card";

type RecommendationEventType = "IMPRESSION" | "CLICK";

function getSessionKey() {
  const storageKey = "velora-recommendation-session";
  const existing = sessionStorage.getItem(storageKey);
  if (existing) return existing;
  const value = crypto.randomUUID();
  sessionStorage.setItem(storageKey, value);
  return value;
}

function recordRecommendationEvent(
  sourceProductId: string,
  recommendedProductId: string,
  eventType: RecommendationEventType,
  strategy: string,
) {
  void fetch("/api/recommendations/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sourceProductId,
      recommendedProductId,
      eventType,
      strategy,
      placement: "product_page",
      sessionKey: getSessionKey(),
    }),
    keepalive: true,
  }).catch(() => undefined);
}

export function RecommendationRail({
  sourceProductId,
  products,
  strategy = "RELATED_SCORE",
}: {
  sourceProductId: string;
  products: Product[];
  strategy?: string;
}) {
  const tracked = useRef(false);
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
    if (tracked.current) return;
    tracked.current = true;
    products.forEach((product) => {
      recordRecommendationEvent(sourceProductId, product.id, "IMPRESSION", strategy);
    });
  }, [products, sourceProductId, strategy]);

  if (!products.length) return null;

  return (
    <div className="mt-10">
      <div className="mb-4 flex justify-end gap-2">
        <button type="button" aria-label="Previous recommendations" disabled={!canPrevious} onClick={() => carousel?.scrollPrev()} className="storefront-action grid size-10 place-items-center border border-[var(--border)] bg-[var(--surface)] disabled:opacity-35"><ChevronLeft className="size-4" /></button>
        <button type="button" aria-label="Next recommendations" disabled={!canNext} onClick={() => carousel?.scrollNext()} className="storefront-action grid size-10 place-items-center border border-[var(--border)] bg-[var(--surface)] disabled:opacity-35"><ChevronRight className="size-4" /></button>
      </div>
      <div ref={viewportRef} className="overflow-hidden">
        <div className="flex gap-4">
          {products.map((product, index) => (
          <div
            key={product.id}
            className="relative min-w-0 shrink-0 basis-[78vw] sm:basis-[calc((100%_-_16px)/2)] lg:basis-[calc((100%_-_64px)/5)]"
            onClick={(event) => {
              if ((event.target as HTMLElement).closest('a[href^="/product/"]')) {
                recordRecommendationEvent(sourceProductId, product.id, "CLICK", strategy);
              }
            }}
          >
            <ProductCard
              product={product}
              priority={index < 5}
              imageSizes="(min-width: 1024px) 20vw, (min-width: 640px) 50vw, 78vw"
            />
          </div>
          ))}
        </div>
      </div>
    </div>
  );
}
