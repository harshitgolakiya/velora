"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { Product } from "@/lib/catalog";

const ProductTabs = dynamic(() => import("./product-tabs").then((mod) => mod.ProductTabs), { ssr: false });
const ProductReviews = dynamic(() => import("./product-reviews").then((mod) => mod.ProductReviews), { ssr: false });
const RecommendationRail = dynamic(() => import("./recommendation-rail").then((mod) => mod.RecommendationRail), { ssr: false });
const RecentlyViewedProducts = dynamic(() => import("./recently-viewed-products").then((mod) => mod.RecentlyViewedProducts), { ssr: false });

function useDeferredProductSection() {
  const [ready, setReady] = useState(() => (typeof window === "undefined" ? false : Boolean(window.location.hash)));

  useEffect(() => {
    const show = () => setReady(true);
    if (window.location.hash) {
      show();
      return undefined;
    }
    const timeout = window.setTimeout(show, 6000);
    window.addEventListener("scroll", show, { once: true, passive: true });
    window.addEventListener("pointerdown", show, { once: true });
    window.addEventListener("hashchange", show, { once: true });
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("scroll", show);
      window.removeEventListener("pointerdown", show);
      window.removeEventListener("hashchange", show);
    };
  }, []);

  return ready;
}

export function DeferredProductTabs({ product }: { product: Product }) {
  const ready = useDeferredProductSection();
  return ready ? <ProductTabs product={product} /> : <div className="mt-20 border-t border-[var(--border)]" aria-hidden="true" />;
}

export function DeferredProductReviews({ product }: { product: Product }) {
  const ready = useDeferredProductSection();
  return ready ? <ProductReviews product={product} /> : null;
}

export function DeferredRecommendationRail({
  sourceProductId,
  products,
  strategy,
}: {
  sourceProductId: string;
  products: Product[];
  strategy?: string;
}) {
  const ready = useDeferredProductSection();
  return ready ? <RecommendationRail sourceProductId={sourceProductId} products={products} strategy={strategy} /> : null;
}

export function DeferredRecentlyViewedProducts({
  current,
  products,
}: {
  current: string;
  products: Product[];
}) {
  const ready = useDeferredProductSection();
  return ready ? <RecentlyViewedProducts current={current} products={products} /> : null;
}
