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
    <div className="grid gap-10 lg:grid-cols-12 lg:gap-12 xl:gap-16">
      <div className="min-w-0 lg:col-span-7">
        <ProductGallery key={selectedColor} product={product} selectedColor={selectedColor} />
      </div>

      <div className="min-w-0 lg:col-span-5 lg:sticky lg:top-28 lg:h-fit">
        <p className="eyebrow eyebrow-muted">{product.category}</p>
        <h1 className="display-lg mt-3 max-w-xl">{product.name}</h1>

        <div className="mt-5 flex flex-wrap items-end gap-x-4 gap-y-2">
          <p className="text-2xl font-medium">
            {formatAed(product.salePrice ?? product.price, locale)}
            {product.salePrice ? <span className="ms-3 text-base font-normal text-[var(--muted)] line-through">{formatAed(product.price, locale)}</span> : null}
          </p>
          {product.reviews > 0 ? (
            <a href="#reviews" className="inline-flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)]" aria-label={`${product.reviews} ${labels.reviewsLabel}`}>
              <span className="flex text-[var(--foreground)]">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star key={index} className={`size-3.5 ${index < Math.round(product.rating) ? "fill-current" : "opacity-25"}`} />
                ))}
              </span>
              <span>
                {new Intl.NumberFormat(locale === "ar" ? "ar-AE" : "en-AE", { maximumFractionDigits: 1 }).format(product.rating)} · {product.reviews} {product.reviews === 1 ? labels.reviewLabel : labels.reviewsLabel}
              </span>
            </a>
          ) : null}
        </div>

        <p className="mt-2 text-sm text-[var(--muted)]">
          {labels.splitPaymentPrefix} <strong className="font-medium text-[var(--foreground)]">{formatAed(Number(installment), locale)}</strong> · {labels.noLateFees}{" "}
          <span className="badge badge-outline ms-1 align-middle">tamara</span>
        </p>

        {identityTags.length ? (
          <div className="mt-5 flex flex-wrap gap-2">
            {identityTags.map((tag) => (
              <span key={tag} className="badge badge-outline">{tag}</span>
            ))}
          </div>
        ) : null}

        <p data-product-summary className="storefront-body-copy mt-6 max-w-xl text-[var(--muted)]">{copy.summary}</p>

        <div className="mt-8">
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
