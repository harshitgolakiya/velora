"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Eye, X } from "lucide-react";
import type { Product } from "@/lib/catalog";
import { focalObjectPosition, resolveProductGalleryMedia } from "@/lib/product-gallery-presentation";
import { splitProductCopy } from "@/lib/product-copy";
import { useStore } from "@/lib/store";
import { formatAed } from "@/lib/utils";

const fallbackColorHex: Record<string, string> = {
  Black: "#111111",
  White: "#f5f5f0",
  Olive: "#6b7a3d",
  Plum: "#6d2b4e",
  Blush: "#e8bfbf",
  Slate: "#5a6070",
  Cream: "#f5edd8",
};

export function QuickView({
  product,
  defaultOpen = false,
  open,
  onOpenChange,
  showTrigger = true,
}: {
  product: Product;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const isControlled = open !== undefined;
  const currentOpen = isControlled ? open : uncontrolledOpen;
  const [color, setColor] = useState(product.colors[0] ?? "");
  const [size, setSize] = useState(product.sizes[0] ?? "");
  const [added, setAdded] = useState(false);
  const addToCart = useStore((state) => state.addToCart);
  const copy = splitProductCopy(product.description);
  const selectedMedia = useMemo(
    () => resolveProductGalleryMedia(product, color).find((item) => item.type === "IMAGE"),
    [color, product],
  );
  const imageRatio = selectedMedia?.width && selectedMedia.height ? selectedMedia.width / selectedMedia.height : undefined;
  const imageFit = imageRatio && imageRatio < 0.72 ? "object-contain" : "object-cover";

  const selectedVariant = useMemo(
    () => product.variants?.find((variant) => variant.color.name === color && variant.size.name === size),
    [color, product.variants, size],
  );
  const outOfStock = selectedVariant
    ? selectedVariant.stock <= 0 &&
      (!selectedVariant.allowBackorder ||
        selectedVariant.backorderAvailable === 0)
    : product.stock <= 0;

  function handleAdd() {
    if (outOfStock) return;
    addToCart(product, { size, color, quantity: 1 });
    setAdded(true);
    window.setTimeout(() => {
      handleOpenChange(false);
      setAdded(false);
    }, 650);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!isControlled) setUncontrolledOpen(nextOpen);
    onOpenChange?.(nextOpen);
    if (nextOpen) {
      setColor(product.colors[0] ?? "");
      setSize(product.sizes[0] ?? "");
      setAdded(false);
    }
  }

  return (
    <Dialog.Root open={currentOpen} onOpenChange={handleOpenChange}>
      {showTrigger ? (
        <Dialog.Trigger asChild>
          <button
            type="button"
            aria-label={`Quick view ${product.name}`}
            className="storefront-action storefront-light-control absolute end-2.5 top-[3.25rem] grid size-9 place-items-center border shadow-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-950 sm:end-3 sm:top-14 sm:size-10 motion-reduce:transition-none"
          >
            <Eye className="size-4.5" />
          </button>
        </Dialog.Trigger>
      ) : null}
      <Dialog.Portal>
        <Dialog.Overlay className="storefront-overlay fixed inset-0 z-[110] bg-black/55 backdrop-blur-sm" />
        <Dialog.Content className="storefront-modal fixed left-1/2 top-1/2 z-[110] max-h-[90vh] w-[calc(100%-2rem)] max-w-3xl overflow-y-auto bg-[var(--surface)] text-[var(--foreground)] shadow-2xl">
          <div className="flex items-start justify-between border-b border-[var(--border)] p-5">
            <Dialog.Title className="font-serif text-2xl">{product.name}</Dialog.Title>
            <Dialog.Close aria-label="Close quick view" className="storefront-action grid size-10 place-items-center border border-transparent transition hover:border-[var(--border)] hover:bg-[var(--hover)] motion-reduce:transition-none">
              <X className="size-5" />
            </Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">Quick view of {product.name}</Dialog.Description>
          <div className="grid gap-6 p-5 sm:grid-cols-2">
            <div className="storefront-product-media relative aspect-[3/4] overflow-hidden">
              <Image
                src={selectedMedia?.url ?? product.images[0]}
                alt={product.name}
                fill
                priority
                sizes="(min-width: 640px) 50vw, 100vw"
                className={imageFit}
                style={{ objectPosition: focalObjectPosition(selectedMedia) }}
              />
            </div>
            <div className="space-y-5">
              {product.salePrice ? (
                <div className="flex items-baseline gap-2">
                  <p className="text-lg font-medium text-[#B42318]">{formatAed(product.salePrice)}</p>
                  <p className="text-sm text-[var(--muted)] line-through">{formatAed(product.price)}</p>
                </div>
              ) : (
                <p className="text-lg font-medium">{formatAed(product.price)}</p>
              )}
              <p className="text-sm leading-6 text-[var(--muted)]">{copy.summary}</p>

              {product.colors.length ? (
                <div>
                  <p className="mb-2 text-sm font-medium">
                    Color <span className="text-[var(--muted)]">{color}</span>
                  </p>
                  <div className="flex flex-wrap gap-2.5" role="group" aria-label="Choose color">
                    {product.colors.map((name) => {
                      const hex = product.colorHex?.[name] ?? fallbackColorHex[name] ?? "#888888";
                      const selected = color === name;
                      return (
                        <button
                          type="button"
                          key={name}
                          onClick={() => setColor(name)}
                          aria-label={`Select ${name}`}
                          aria-pressed={selected}
                          title={name}
                          style={{ backgroundColor: hex }}
                          className={`storefront-action size-8 border-2 transition motion-reduce:transition-none ${
                            selected
                              ? "border-[var(--foreground)] ring-2 ring-[var(--foreground)] ring-offset-2 ring-offset-[var(--background)]"
                              : "border-[var(--surface)] shadow-sm hover:scale-105"
                          }`}
                        />
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {product.sizes.length ? (
                <div>
                  <p className="mb-2 text-sm font-medium">Size</p>
                  <div className="flex flex-wrap gap-2" role="group" aria-label="Choose size">
                    {product.sizes.map((name) => (
                      <button
                        type="button"
                        key={name}
                        onClick={() => setSize(name)}
                        aria-pressed={size === name}
                        className={`storefront-action h-10 min-w-11 border px-3 text-sm font-medium transition-colors motion-reduce:transition-none ${
                          size === name
                            ? "border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)]"
                            : "border-[var(--border)] hover:border-[var(--foreground)]"
                        }`}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <div>
                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={outOfStock}
                  className="storefront-action h-11 w-full border border-[var(--foreground)] bg-[var(--foreground)] text-sm font-semibold text-[var(--background)] transition hover:bg-[var(--accent)] hover:text-[#111315] disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:transition-none"
                >
                  {outOfStock ? "Out of stock" : added ? "Added to bag" : "Add to bag"}
                </button>
                {added ? <p className="mt-2 text-xs text-[var(--muted)]" role="status">Added one item to your bag.</p> : null}
              </div>

              <Link
                href={`/product/${product.slug}`}
                className="inline-flex text-sm font-medium underline underline-offset-4"
              >
                View full details
              </Link>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
