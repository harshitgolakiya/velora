"use client";

import { useEffect, useRef } from "react";
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

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    products.forEach((product) => {
      recordRecommendationEvent(sourceProductId, product.id, "IMPRESSION", strategy);
    });
  }, [products, sourceProductId, strategy]);

  if (!products.length) return null;

  return (
    <div>
      <div className="mt-10 grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
        {products.map((product, index) => (
          <div
            key={product.id}
            className="relative"
            onClick={(event) => {
              if ((event.target as HTMLElement).closest('a[href^="/product/"]')) {
                recordRecommendationEvent(sourceProductId, product.id, "CLICK", strategy);
              }
            }}
          >
            <ProductCard
              product={product}
              priority={index < 4}
              imageSizes="(min-width: 1440px) 330px, (min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
