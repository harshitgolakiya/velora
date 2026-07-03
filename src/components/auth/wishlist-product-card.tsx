"use client";

import { useMemo, useState } from "react";
import { Check, ShoppingBag } from "lucide-react";
import type { Product } from "@/lib/catalog";
import { useStore } from "@/lib/store";
import { ProductCard } from "@/components/store/product-card";

function firstAvailableVariant(product: Product) {
  return product.variants?.find((variant) => variant.stock > 0 || variant.allowBackorder);
}

export function WishlistProductCard({ product }: { product: Product }) {
  const fallbackVariant = firstAvailableVariant(product);
  const savedIntent = useStore((state) => state.wishlistIntents[product.slug]);
  const intendedVariant = product.variants?.find((variant) => variant.id === savedIntent?.variantId)
    ?? product.variants?.find((variant) => variant.color.name === savedIntent?.color && variant.size.name === savedIntent?.size);
  const initialVariant = intendedVariant ?? fallbackVariant;
  const [color, setColor] = useState(initialVariant?.color.name ?? product.colors[0] ?? "");
  const colorVariants = useMemo(
    () => product.variants?.filter((variant) => variant.color.name === color) ?? [],
    [color, product.variants],
  );
  const availableSizes = colorVariants.filter((variant) => variant.stock > 0 || variant.allowBackorder);
  const [size, setSize] = useState(initialVariant?.size.name ?? availableSizes[0]?.size.name ?? product.sizes[0] ?? "");
  const selectedVariant = colorVariants.find((variant) => variant.size.name === size);
  const unavailable = !selectedVariant || (selectedVariant.stock <= 0 && !selectedVariant.allowBackorder);
  const stockMessage = selectedVariant
    ? selectedVariant.allowBackorder && selectedVariant.stock <= 0
      ? "Backorder available"
      : selectedVariant.stock > 0
        ? selectedVariant.stock <= 3
          ? `Only ${selectedVariant.stock} left`
          : "Ready to move"
        : "Select an available size"
    : "Choose a color and size";
  const addToCart = useStore((state) => state.addToCart);
  const toggleWishlist = useStore((state) => state.toggleWishlist);
  const setWishlistIntent = useStore((state) => state.setWishlistIntent);
  const [added, setAdded] = useState(false);

  function chooseColor(nextColor: string) {
    const nextVariants = product.variants?.filter((variant) => variant.color.name === nextColor) ?? [];
    const preferredVariant =
      nextVariants.find((variant) => variant.size.name === size && (variant.stock > 0 || variant.allowBackorder)) ??
      nextVariants.find((variant) => variant.stock > 0 || variant.allowBackorder) ??
      nextVariants[0];
    const nextSize = preferredVariant?.size.name ?? "";
    setColor(nextColor);
    setSize(nextSize);
    setWishlistIntent(product.slug, { variantId: preferredVariant?.id, color: nextColor, size: nextSize });
  }

  function chooseSize(nextSize: string) {
    setSize(nextSize);
    const variant = colorVariants.find((candidate) => candidate.size.name === nextSize);
    setWishlistIntent(product.slug, { variantId: variant?.id, color, size: nextSize });
  }

  function moveToBag() {
    if (unavailable || !size || !color) return;
    addToCart(product, { color, size, quantity: 1 });
    toggleWishlist(product.slug);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1800);
  }

  return (
    <div className="grid gap-3">
      <ProductCard
        product={product}
        imageSizes="(min-width: 1280px) 300px, (min-width: 640px) 50vw, 100vw"
      />
      <div className="grid gap-2 border border-[var(--border)] bg-[var(--background)] p-3">
        <div className="grid grid-cols-2 gap-2">
          <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
            Color
            <select
              value={color}
              onChange={(event) => chooseColor(event.target.value)}
              className="h-10 border border-[var(--border)] bg-[var(--surface)] px-2 text-sm font-medium normal-case tracking-normal text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
            >
              {product.colors.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
            Size
            <select
              value={size}
              onChange={(event) => chooseSize(event.target.value)}
              className="h-10 border border-[var(--border)] bg-[var(--surface)] px-2 text-sm font-medium normal-case tracking-normal text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
            >
              {colorVariants.map((variant) => (
                <option
                  key={variant.id}
                  value={variant.size.name}
                  disabled={variant.stock <= 0 && !variant.allowBackorder}
                >
                  {variant.size.name}{variant.stock <= 0 && !variant.allowBackorder ? " - out" : ""}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button
          type="button"
          onClick={moveToBag}
          disabled={unavailable}
          className="inline-flex h-11 items-center justify-center gap-2 bg-[var(--foreground)] px-4 text-sm font-semibold uppercase tracking-[0.1em] text-[var(--background)] disabled:opacity-45"
        >
          {added ? <Check className="size-4" /> : <ShoppingBag className="size-4" />}
          {added ? "Added" : "Move to bag"}
        </button>
        <p className="text-xs text-[var(--muted)]" role="status">{stockMessage}</p>
      </div>
    </div>
  );
}
