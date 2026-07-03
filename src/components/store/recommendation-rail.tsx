"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import type { Product } from "@/lib/catalog";
import { ProductCard } from "./product-card";

type RecommendationEventType = "IMPRESSION" | "CLICK" | "DISMISS";

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
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    products.forEach((product) => {
      recordRecommendationEvent(sourceProductId, product.id, "IMPRESSION", strategy);
    });
  }, [products, sourceProductId, strategy]);

  const visibleProducts = products.filter((product) => !dismissed.includes(product.id));

  return (
    <div>
      <p className="sr-only" aria-live="polite">{message}</p>
      {visibleProducts.length ? (
        <div className="mt-10 grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {visibleProducts.map((product) => (
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
                imageSizes="(min-width: 1440px) 330px, (min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
              />
              <button
                type="button"
                title="Hide this recommendation"
                aria-label={`Hide ${product.name} from recommendations`}
                onClick={() => {
                  setDismissed((current) => [...current, product.id]);
                  setMessage(`${product.name} removed from recommendations.`);
                  recordRecommendationEvent(sourceProductId, product.id, "DISMISS", strategy);
                }}
                className="mt-3 inline-flex items-center gap-1.5 text-xs text-[var(--muted)] underline-offset-4 transition hover:text-[var(--foreground)] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                <X className="size-3.5" aria-hidden="true" />
                Not relevant
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-10 border-y border-[var(--border)] py-10 text-center">
          <p className="text-sm text-[var(--muted)]">Thanks. We will use your feedback to improve recommendations.</p>
          <button
            type="button"
            onClick={() => {
              setDismissed([]);
              setMessage("Recommendations restored.");
            }}
            className="mt-4 text-sm font-medium underline underline-offset-4"
          >
            Show recommendations again
          </button>
        </div>
      )}
    </div>
  );
}
