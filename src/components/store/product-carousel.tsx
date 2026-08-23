"use client";

import type { Product } from "@/lib/catalog";
import { ProductCard } from "./product-card";
import { ProductScroller } from "./product-scroller";

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
  return (
    <ProductScroller title={title} subtitle={subtitle} ctaHref={ctaHref} ctaLabel={ctaLabel}>
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
    </ProductScroller>
  );
}
