"use client";

import { useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Star } from "lucide-react";
import type { Product } from "@/lib/catalog";
import { getProductFitGuidance } from "@/lib/fit-guidance";
import { splitProductCopy } from "@/lib/product-copy";
import { formatAed } from "@/lib/utils";
import { ProductActions } from "./product-actions";
import { ProductGallery } from "./product-gallery";

export function ProductDetail({
  product,
  fitPreferences,
}: {
  product: Product;
  fitPreferences?: { preferredSize?: string | null; fitPreference?: string | null; compressionPreference?: string | null };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialColor = searchParams.get("color");
  const initialSize = searchParams.get("size");
  const requestedSize = initialSize?.trim() || undefined;
  const [selectedColor, setSelectedColor] = useState(
    initialColor && product.colors.includes(initialColor) ? initialColor : product.colors[0],
  );
  const [selectedSize, setSelectedSize] = useState(
    initialSize && product.sizes.includes(initialSize)
      ? initialSize
      : fitPreferences?.preferredSize && product.sizes.includes(fitPreferences.preferredSize)
        ? fitPreferences.preferredSize
        : product.sizes[0],
  );
  const selectedColorRef = useRef(selectedColor);
  const selectedSizeRef = useRef(selectedSize);
  const installment = ((product.salePrice ?? product.price) / 4).toFixed(2);
  const copy = splitProductCopy(product.description);
  const fitGuidance = getProductFitGuidance(product);

  function updateSelection(color: string, size: string) {
    const params = new URLSearchParams(window.location.search);
    params.set("color", color);
    params.set("size", size);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function changeColor(color: string, fallbackSize?: string) {
    const nextSize = fallbackSize ?? selectedSizeRef.current;
    selectedColorRef.current = color;
    selectedSizeRef.current = nextSize;
    setSelectedColor(color);
    if (fallbackSize) setSelectedSize(fallbackSize);
    updateSelection(color, nextSize);
  }

  function changeSize(size: string) {
    selectedSizeRef.current = size;
    setSelectedSize(size);
    updateSelection(selectedColorRef.current, size);
  }

  return (
    <div className="grid gap-8 pb-28 sm:pb-0 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10">
      <ProductGallery key={selectedColor} product={product} selectedColor={selectedColor} />

      <div className="lg:sticky lg:top-28 lg:h-fit">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">
          {product.category}
        </p>
        <h1 className="mt-2 text-4xl leading-[1.02] sm:font-serif sm:text-5xl sm:leading-none">{product.name}</h1>

        {product.reviews > 0 ? (
          <div className="mt-4 flex items-center gap-3">
            <div className="flex text-[var(--foreground)]">
              {Array.from({ length: 5 }).map((_, index) => (
                <Star
                  key={index}
                  className={`size-3.5 ${index < Math.round(product.rating) ? "fill-current" : "opacity-25"}`}
                />
              ))}
            </div>
            <span className="text-sm text-[var(--muted)]">
              {product.rating.toFixed(1)} ({product.reviews} {product.reviews === 1 ? "review" : "reviews"})
            </span>
          </div>
        ) : null}

        <div className="mt-5">
          <div className="flex items-end gap-3 text-xl font-semibold sm:text-2xl">
            <span>{formatAed(product.salePrice ?? product.price)}</span>
            {product.salePrice ? (
              <span className="text-base text-[var(--muted)] line-through">
                {formatAed(product.price)}
              </span>
            ) : null}
          </div>
          <div className="mt-2 flex items-center gap-2 border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--muted)]">
            <span>
              Or split in 4 payments of{" "}
              <strong className="text-[var(--foreground)]">AED {installment}</strong> - No late fees.{" "}
              <button className="text-xs text-[var(--muted)] underline underline-offset-4 hover:text-[var(--foreground)]">More options</button>
            </span>
            <span className="ml-auto shrink-0 bg-[#7b3fe4] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
              tamara
            </span>
          </div>
        </div>

        <p className="mt-5 max-w-xl leading-7 text-[var(--muted)]">{copy.summary}</p>

        <div className="mt-6 border-y border-[var(--border)] py-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Fit guidance</p>
          <p className="mt-3 text-sm leading-6 text-[var(--foreground)]">{fitGuidance.fit}</p>
          <div className="mt-4 grid gap-3 text-sm text-[var(--muted)] sm:grid-cols-2">
            <p>{fitGuidance.model}</p>
            <p>{fitGuidance.sizeAdvice}</p>
          </div>
        </div>

        <div className="mt-8">
          <ProductActions
            product={product}
            selectedColor={selectedColor}
            selectedSize={requestedSize ?? selectedSize}
            onColorChange={changeColor}
            onSizeChange={changeSize}
            preferredSize={fitPreferences?.preferredSize}
          />
        </div>
      </div>
    </div>
  );
}
