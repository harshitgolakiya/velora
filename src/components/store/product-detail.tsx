"use client";

import { useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Star } from "lucide-react";
import type { Product } from "@/lib/catalog";
import { splitProductCopy } from "@/lib/product-copy";
import { formatAed } from "@/lib/utils";
import { ProductActions } from "./product-actions";
import { ProductGallery } from "./product-gallery";
import { localeFromPathname, productCopy } from "@/lib/i18n";

export function ProductDetail({
  product,
  fitPreferences,
}: {
  product: Product;
  fitPreferences?: { preferredSize?: string | null; fitPreference?: string | null; compressionPreference?: string | null };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const locale = localeFromPathname(pathname);
  const labels = productCopy[locale];
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
  const actionSelectedSize = requestedSize && !product.sizes.includes(requestedSize) ? requestedSize : selectedSize;
  const identityTags = [
    product.bestSeller ? "Best seller" : null,
    product.newArrival ? "New arrival" : null,
    product.salePrice ? "Limited price" : null,
    ...(product.tags ?? []).slice(0, 2),
  ].filter(Boolean) as string[];

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
    <div className="grid gap-8 pb-8 sm:pb-0 lg:grid-cols-[minmax(0,0.92fr)_minmax(410px,0.78fr)] lg:gap-9 xl:grid-cols-[minmax(0,620px)_minmax(420px,1fr)] xl:gap-12">
      <div className="min-w-0 lg:max-w-[620px]">
        <ProductGallery key={selectedColor} product={product} selectedColor={selectedColor} />
      </div>

      <div className="min-w-0 lg:sticky lg:top-28 lg:h-fit lg:max-w-[620px]">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">
          {product.category}
        </p>
        <h1 className="mt-2 max-w-xl text-4xl leading-[1.02] sm:font-serif sm:text-5xl sm:leading-none">{product.name}</h1>
        {identityTags.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {identityTags.map((tag) => (
              <span key={tag} className="storefront-light-chip border border-[var(--border)] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                {tag}
              </span>
            ))}
          </div>
        ) : null}

        {product.reviews > 0 ? (
          <a href="#reviews" className="storefront-action mt-4 flex w-fit items-center gap-3 hover:opacity-70" aria-label={`${product.reviews} ${labels.reviewsLabel}`}>
            <div className="flex text-[var(--foreground)]">
              {Array.from({ length: 5 }).map((_, index) => (
                <Star
                  key={index}
                  className={`size-3.5 ${index < Math.round(product.rating) ? "fill-current" : "opacity-25"}`}
                />
              ))}
            </div>
            <span className="text-sm text-[var(--muted)]">
              {new Intl.NumberFormat(locale === "ar" ? "ar-AE" : "en-AE", { maximumFractionDigits: 1 }).format(product.rating)} ({product.reviews} {product.reviews === 1 ? labels.reviewLabel : labels.reviewsLabel})
            </span>
          </a>
        ) : null}

        <div className="mt-5">
          <div className="flex items-end gap-3 text-xl font-semibold sm:text-2xl">
            <span>{formatAed(product.salePrice ?? product.price, locale)}</span>
            {product.salePrice ? (
              <span className="text-base text-[var(--muted)] line-through">
                {formatAed(product.price, locale)}
              </span>
            ) : null}
          </div>
          <div className="storefront-framed mt-2 flex items-center gap-2 px-3 py-2 text-sm text-[var(--muted)]">
            <span>
              {labels.splitPaymentPrefix}{" "}
              <strong className="text-[var(--foreground)]">{formatAed(Number(installment), locale)}</strong> - {labels.noLateFees}{" "}
              <button className="storefront-action -mx-1 inline-flex min-h-8 items-center px-1 text-xs text-[var(--muted)] underline underline-offset-4 hover:text-[var(--foreground)]">{labels.moreOptions}</button>
            </span>
            <span className="ml-auto shrink-0 rounded-[var(--radius-control)] bg-[#7b3fe4] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
              tamara
            </span>
          </div>
        </div>

        <p data-product-summary className="storefront-body-copy mt-5 max-w-xl text-[var(--muted)]">{copy.summary}</p>

        <div className="mt-7">
          <ProductActions
            product={product}
            selectedColor={selectedColor}
            selectedSize={actionSelectedSize}
            onColorChange={changeColor}
            onSizeChange={changeSize}
            preferredSize={fitPreferences?.preferredSize}
          />
        </div>
      </div>
    </div>
  );
}
