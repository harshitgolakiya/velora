"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Heart, LoaderCircle, Minus, Plus, Ruler, X } from "lucide-react";
import type { Product } from "@/lib/catalog";
import { localeFromPathname, productCopy } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { formatAed } from "@/lib/utils";
import { getVariantAvailability } from "@/lib/variant-availability";

const fallbackColorHex: Record<string, string> = {
  Black: "#111111",
  White: "#f5f5f0",
  Olive: "#6b7a3d",
  Plum: "#6d2b4e",
  Blush: "#e8bfbf",
  Slate: "#5a6070",
  Cream: "#f5edd8",
};

export function ProductActions({
  product,
  selectedColor,
  selectedSize,
  onColorChange,
  onSizeChange,
  preferredSize,
}: {
  product: Product;
  selectedColor?: string;
  selectedSize?: string;
  onColorChange?: (color: string, fallbackSize?: string) => void;
  onSizeChange?: (size: string) => void;
  preferredSize?: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const locale = localeFromPathname(pathname);
  const copy = productCopy[locale];
  const [internalSize, setInternalSize] = useState(product.sizes[0]);
  const [internalColor, setInternalColor] = useState(product.colors[0]);
  const [qty, setQty] = useState(1);
  const [status, setStatus] = useState<"idle" | "adding" | "added" | "error">("idle");
  const [alertEmail, setAlertEmail] = useState("");
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [alertLoading, setAlertLoading] = useState(false);
  const [alertState, setAlertState] = useState<"idle" | "success" | "existing" | "error">("idle");
  const [desktopBar, setDesktopBar] = useState(false);
  const controlsRef = useRef<HTMLDivElement>(null);
  const color = selectedColor ?? internalColor;
  const size = selectedSize ?? internalSize;
  const addToCart = useStore((state) => state.addToCart);
  const reservationError = useStore((state) => state.cartReservationError);
  const wishlist = useStore((state) => state.wishlist);
  const toggleWishlist = useStore((state) => state.toggleWishlist);
  const inWishlist = wishlist.includes(product.slug);
  const availability = useMemo(
    () => getVariantAvailability(product, color, size),
    [color, product, size],
  );
  const colorVariants = availability.colorVariants;
  const effectiveSize = availability.effectiveSize;
  const selectedVariant = availability.selectedVariant;
  const canBackorder = availability.canBackorder;
  const outOfStock = availability.outOfStock;
  const stockLimit = selectedVariant?.stock ?? product.stock;
  const lowStockThreshold = selectedVariant?.lowStockThreshold ?? 5;
  const backorderCapacity = selectedVariant?.backorderAvailable;
  const maxSelectableQty = canBackorder
    ? backorderCapacity ?? Number.POSITIVE_INFINITY
    : Math.max(stockLimit, 1);
  const lowStock =
    !outOfStock &&
    !canBackorder &&
    stockLimit > 0 &&
    stockLimit <= lowStockThreshold;
  const effectiveQty = Math.min(qty, maxSelectableQty);
  const backorderMessage = selectedVariant?.backorderMessage?.trim()
    || (selectedVariant?.backorderShipsAt
      ? `Ships after ${new Date(selectedVariant.backorderShipsAt).toLocaleDateString()}.`
      : copy.backorderNote);
  const unitPrice = product.salePrice ?? product.price;
  const mobileBarPrice = formatAed(unitPrice * effectiveQty);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    const observer = new IntersectionObserver(
      ([entry]) => setDesktopBar(!entry.isIntersecting),
      { threshold: 0, rootMargin: "-100px 0px 0px" },
    );
    observer.observe(controls);
    return () => observer.disconnect();
  }, []);

  function addSelectedVariant() {
    if (outOfStock) return;
    setStatus("adding");
    try {
      addToCart(product, { size: effectiveSize, color, quantity: effectiveQty });
      window.setTimeout(() => setStatus("added"), 180);
      window.setTimeout(() => setStatus("idle"), 2200);
    } catch {
      setStatus("error");
    }
  }

  function buyNow() {
    if (outOfStock) return;
    addToCart(product, { size: effectiveSize, color, quantity: effectiveQty });
    router.push("/checkout");
  }

  async function submitAlert(type: "BACK_IN_STOCK" | "PRICE_DROP") {
    if (!alertEmail.trim()) {
      setAlertMessage(copy.enterEmailFirst);
      return;
    }
    setAlertLoading(true);
    setAlertMessage(null);
    try {
      const response = await fetch("/api/product-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          email: alertEmail,
          productId: product.id,
          variantId: type === "BACK_IN_STOCK" ? selectedVariant?.id : undefined,
          targetPrice: product.salePrice ?? product.price,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? copy.unableToSaveAlert);
      setAlertMessage(result.message ?? copy.alertSaved);
      setAlertState(result.created === false ? "existing" : "success");
    } catch (error) {
      setAlertMessage(error instanceof Error ? error.message : copy.unableToSaveAlert);
      setAlertState("error");
    } finally {
      setAlertLoading(false);
    }
  }

  async function removeAlert(type: "BACK_IN_STOCK" | "PRICE_DROP") {
    setAlertLoading(true);
    try {
      const response = await fetch("/api/product-alerts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, email: alertEmail, productId: product.id, variantId: type === "BACK_IN_STOCK" ? selectedVariant?.id : undefined }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? copy.unableToRemoveAlert);
      setAlertMessage(result.message);
      setAlertState("idle");
    } catch (error) {
      setAlertMessage(error instanceof Error ? error.message : copy.unableToRemoveAlert);
      setAlertState("error");
    } finally {
      setAlertLoading(false);
    }
  }

  function selectColor(name: string, preferredAvailableSize?: string) {
    const availableSize = product.variants?.find(
      (variant) =>
        variant.color.name === name &&
        (!preferredAvailableSize || variant.size.name === preferredAvailableSize) &&
        (variant.stock > 0 || variant.allowBackorder),
    )?.size.name ?? product.variants?.find(
      (variant) =>
        variant.color.name === name &&
        (variant.stock > 0 || variant.allowBackorder),
    )?.size.name;
    if (availableSize) setInternalSize(availableSize);
    setQty(1);
    setInternalColor(name);
    onColorChange?.(name, availableSize);
  }

  function sizeState(name: string) {
    if (!product.variants?.length) {
      return { exists: true, available: product.stock > 0 };
    }
    const variant = colorVariants.find((item) => item.size.name === name);
    return {
      exists: Boolean(variant),
      available: Boolean(
        variant && (variant.stock > 0 || variant.allowBackorder),
      ),
    };
  }

  const addLabel =
    outOfStock
      ? copy.outOfStock
      : status === "adding"
        ? copy.adding
        : status === "added"
          ? copy.addedToBag
          : copy.addToBag;

  return (
    <div ref={controlsRef} id="purchase-options" className="space-y-6 scroll-mt-24">
      <div>
        <div className="mb-3 flex items-center justify-between text-sm">
          <span className="font-medium">{copy.color}</span>
          <span className="text-[var(--muted)]">{color}</span>
        </div>
        <div className="flex flex-wrap gap-2.5" role="group" aria-label={copy.chooseColor}>
          {product.colors.map((name) => {
            const hex = product.colorHex?.[name] ?? fallbackColorHex[name] ?? "#888888";
            const selected = color === name;
            return (
              <button
                type="button"
                key={name}
                onClick={() => selectColor(name)}
                aria-label={`${copy.select} ${name}`}
                aria-pressed={selected}
                title={name}
                style={{ backgroundColor: hex }}
                className={`size-7 border-2 transition motion-reduce:transition-none ${
                  selected
                    ? "border-[var(--foreground)] ring-2 ring-[var(--foreground)] ring-offset-2 ring-offset-[var(--background)]"
                    : "border-[var(--surface)] shadow-sm hover:scale-105"
                }`}
              />
            );
          })}
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between text-sm">
          <span className="font-medium">{copy.size}{preferredSize && product.sizes.includes(preferredSize) ? ` · ${copy.saved} ${preferredSize}` : ""}</span>
          <Dialog.Root>
            <Dialog.Trigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 text-xs text-[var(--muted)] underline"
              >
                <Ruler className="size-3.5" />
                {copy.sizeGuide}
              </button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm" />
              <Dialog.Content className="fixed inset-y-0 end-0 z-50 w-full max-w-lg overflow-y-auto bg-[var(--surface)] p-6 text-[var(--foreground)] shadow-2xl">
                <div className="flex items-start justify-between gap-5">
                  <div>
                    <Dialog.Title className="text-2xl font-semibold">
                      {product.category} {copy.sizeGuide.toLowerCase()}
                    </Dialog.Title>
                    <Dialog.Description className="mt-2 text-sm leading-6 text-[var(--muted)]">
                      {copy.sizeGuideDescription}
                    </Dialog.Description>
                  </div>
                  <Dialog.Close
                    aria-label={copy.closeSizeGuide}
                    className="grid size-10 place-items-center"
                  >
                    <X className="size-5" />
                  </Dialog.Close>
                </div>
                <div className="mt-8 overflow-x-auto">
                  <table className="w-full border-collapse text-start text-sm">
                    <thead>
                      <tr className="border-b border-[var(--border)] text-xs uppercase tracking-wider text-[var(--muted)]">
                        <th className="py-3">{copy.size}</th>
                        <th className="py-3">{copy.bust}</th>
                        <th className="py-3">{copy.waist}</th>
                        <th className="py-3">{copy.hip}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {product.sizes.map((name, index) => (
                        <tr key={name} className="border-b border-[var(--border)]">
                          <td className="py-4 font-medium">{name}</td>
                          <td className="py-4">{78 + index * 5}-{82 + index * 5}</td>
                          <td className="py-4">{60 + index * 5}-{64 + index * 5}</td>
                          <td className="py-4">{86 + index * 5}-{90 + index * 5}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-6 text-sm leading-6 text-[var(--muted)]">
                  {product.category.toLowerCase().includes("legging")
                    ? copy.compressiveFitNote
                    : copy.regularFitNote}
                </p>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label={copy.chooseSize}>
          {product.sizes.map((name) => {
            const state = sizeState(name);
            const disabled = !state.exists || !state.available;
            return (
              <button
                type="button"
                key={name}
                onClick={() => {
                  setInternalSize(name);
                  setQty(1);
                  onSizeChange?.(name);
                }}
                disabled={disabled}
                aria-label={`${name}${disabled ? ` ${copy.unavailable}` : ""}`}
                aria-pressed={effectiveSize === name}
                className={`relative h-10 min-w-11 border px-3 text-sm font-medium transition-colors ${
                  effectiveSize === name
                    ? "border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)]"
                    : "border-[var(--border)] hover:border-[var(--foreground)]"
                } disabled:cursor-not-allowed disabled:opacity-35`}
              >
                {name}
                {disabled ? (
                  <span className="absolute left-1/2 top-1/2 h-px w-8 -translate-x-1/2 -translate-y-1/2 -rotate-45 bg-current" />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {availability.needsRecovery ? (
        <div className="border border-[var(--border)] bg-[var(--surface)] p-4 text-sm leading-6">
          <p className="font-medium text-[var(--foreground)]">
            Size {size} is not available in {color}.
          </p>
          {availability.availableSizesForColor.length ? (
            <div className="mt-3">
              <p className="text-[var(--muted)]">Available in this color:</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {availability.availableSizesForColor.map((name) => (
                <button
                  type="button"
                  key={name}
                  aria-label={`Select available size ${name}`}
                    onClick={() => {
                      setInternalSize(name);
                      setQty(1);
                      onSizeChange?.(name);
                    }}
                    className="border border-[var(--foreground)] px-3 py-1.5 text-xs font-semibold transition hover:bg-[var(--foreground)] hover:text-[var(--background)] motion-reduce:transition-none"
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          {availability.sameSizeAlternativeColors.length ? (
            <div className="mt-3">
              <p className="text-[var(--muted)]">Same size available in:</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {availability.sameSizeAlternativeColors.map((name) => (
                  <button
                    type="button"
                    key={name}
                    aria-label={`Select ${name} in size ${size}`}
                    onClick={() => selectColor(name, size)}
                    className="border border-[var(--border)] px-3 py-1.5 text-xs font-semibold transition hover:border-[var(--foreground)] motion-reduce:transition-none"
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <div>
        <span className="mb-3 block text-sm font-medium">{copy.quantity}</span>
        <div className="flex items-center gap-3">
          <div className="flex items-center border border-[var(--border)]">
            <button
              type="button"
              onClick={() => setQty(Math.max(1, effectiveQty - 1))}
              aria-label={copy.decreaseQuantity}
              className="grid size-11 place-items-center"
            >
              <Minus className="size-4" />
            </button>
            <span className="w-10 text-center text-sm font-medium">{effectiveQty}</span>
            <button
              type="button"
              onClick={() => setQty(effectiveQty + 1)}
              disabled={Number.isFinite(maxSelectableQty) && effectiveQty >= maxSelectableQty}
              aria-label={copy.increaseQuantity}
              className="grid size-11 place-items-center disabled:opacity-35"
            >
              <Plus className="size-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={addSelectedVariant}
            disabled={outOfStock || status === "adding"}
            aria-live="polite"
            className="h-11 flex-1 bg-[var(--foreground)] text-sm font-semibold text-[var(--background)] transition hover:bg-[var(--accent)] hover:text-stone-950 disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:transition-none"
          >
            {status === "adding" ? (
              <span className="inline-flex items-center gap-2">
                <LoaderCircle className="size-4 animate-spin" />
                {copy.adding}
              </span>
            ) : status === "added" ? (
              <span className="inline-flex items-center gap-2">
                <Check className="size-4" />
                {copy.added}
              </span>
            ) : addLabel}
          </button>

          <button
            type="button"
            onClick={() => toggleWishlist(product.slug, selectedVariant ? { variantId: selectedVariant.id, color, size: effectiveSize } : { color, size: effectiveSize })}
            aria-label={inWishlist ? copy.removeFromWishlist : copy.addToWishlist}
            aria-pressed={inWishlist}
            className={`grid size-11 shrink-0 place-items-center border ${
              inWishlist
                ? "border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)]"
                : "border-[var(--border)]"
            }`}
          >
            <Heart className={`size-4 ${inWishlist ? "fill-current" : ""}`} />
          </button>
        </div>

        {outOfStock ? (
          <p className="mt-2 text-xs text-[var(--muted)]">
            {copy.outOfStockNote}
          </p>
        ) : lowStock ? (
          <p className="mt-2 text-xs font-medium">
            {copy.onlyLeftIn} {stockLimit} {copy.leftInPrefix} {color}, {copy.sizePrefix} {effectiveSize}.
          </p>
        ) : canBackorder ? (
          <p className="mt-2 text-xs text-[var(--muted)]">
            {backorderMessage}
            {backorderCapacity != null ? ` ${backorderCapacity} available for backorder.` : null}
          </p>
        ) : null}
        {status === "error" ? (
          <p className="mt-2 text-xs text-red-600" role="alert">{copy.addToCartError}</p>
        ) : null}
        {reservationError ? (
          <p className="mt-2 text-xs text-red-600" role="alert">{reservationError}</p>
        ) : null}

        <div className="mt-4 grid gap-2 border border-[var(--border)] bg-[var(--surface)] p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
            {outOfStock ? copy.backInStockAlert : copy.priceDropAlert}
          </p>
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
            <label htmlFor="product-alert-email" className="sr-only">{copy.emailAddress}</label>
            <input
              id="product-alert-email"
              type="email"
              value={alertEmail}
              onChange={(event) => setAlertEmail(event.target.value)}
              placeholder={copy.emailAddress}
              className="h-10 border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            />
            <button
              type="button"
              onClick={() => void submitAlert(outOfStock ? "BACK_IN_STOCK" : "PRICE_DROP")}
              disabled={alertLoading || (outOfStock && !selectedVariant?.id)}
              className="h-10 border border-[var(--foreground)] px-4 text-xs font-semibold uppercase tracking-[0.1em] disabled:opacity-45"
            >
              {alertLoading ? copy.saving : outOfStock ? copy.notifyMe : copy.trackPrice}
            </button>
          </div>
          {alertMessage ? <div role={alertState === "error" ? "alert" : "status"} className={`flex flex-wrap items-center justify-between gap-2 text-xs leading-5 ${alertState === "error" ? "text-red-600" : alertState === "success" || alertState === "existing" ? "text-emerald-600" : "text-[var(--muted)]"}`}><span>{alertMessage}</span>{alertState === "success" || alertState === "existing" ? <button type="button" onClick={() => void removeAlert(outOfStock ? "BACK_IN_STOCK" : "PRICE_DROP")} className="font-semibold underline underline-offset-4">{copy.removeAlert}</button> : null}</div> : null}
        </div>

        <button
          type="button"
          onClick={buyNow}
          disabled={outOfStock}
          className="mt-3 h-11 w-full border border-[var(--foreground)] text-sm font-semibold uppercase tracking-[0.12em] transition hover:bg-[var(--foreground)] hover:text-[var(--background)] disabled:opacity-40"
        >
          {copy.buyNow}
        </button>

        <div className="mt-5 grid gap-1 border-t border-[var(--border)] pt-4 text-xs leading-5 text-[var(--muted)]">
          <p>
            {outOfStock
              ? copy.restockUnknown
              : canBackorder && stockLimit <= 0
                ? copy.shipsAfterReplenishment
                : copy.deliveryEstimate}
          </p>
          <p>{copy.deliveryReturnsNote}</p>
        </div>
      </div>

      <div
        className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--border)] bg-[var(--surface)]/96 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 shadow-[0_-10px_30px_rgba(0,0,0,0.14)] backdrop-blur sm:hidden"
        aria-label="Mobile purchase summary"
      >
        <div className="mb-2 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => controlsRef.current?.scrollIntoView({ block: "start", behavior: "smooth" })}
            className="min-w-0 text-left"
          >
            <span className="block truncate text-sm font-semibold">{product.name}</span>
            <span className="block truncate text-xs text-[var(--muted)]">
              {color} / {effectiveSize} {effectiveQty > 1 ? `/ Qty ${effectiveQty}` : ""}
            </span>
          </button>
          <span className="shrink-0 text-sm font-semibold">{mobileBarPrice}</span>
        </div>
        <button
          type="button"
          onClick={addSelectedVariant}
          disabled={outOfStock || status === "adding"}
          className="h-12 w-full bg-[var(--foreground)] text-sm font-semibold text-[var(--background)] transition hover:bg-[var(--accent)] hover:text-stone-950 disabled:opacity-40 motion-reduce:transition-none"
        >
          {status === "added"
            ? copy.addedToBag
            : outOfStock
              ? copy.outOfStock
              : copy.addToBag}
        </button>
      </div>

      {desktopBar ? (
        <div className="fixed inset-x-0 bottom-0 z-30 hidden border-t border-[var(--border)] bg-[var(--surface)]/96 px-6 py-3 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] backdrop-blur sm:block">
          <div className="mx-auto flex max-w-[1440px] items-center gap-5">
            <div className="min-w-0">
              <p className="truncate font-medium">{product.name}</p>
              <p className="text-xs text-[var(--muted)]">{color} / {effectiveSize}</p>
            </div>
            <p className="ms-auto text-sm font-medium">{formatAed(unitPrice)}</p>
            <button
              type="button"
              onClick={addSelectedVariant}
              disabled={outOfStock || status === "adding"}
              className="h-11 min-w-48 bg-[var(--foreground)] px-6 text-sm font-semibold text-[var(--background)] transition hover:bg-[var(--accent)] hover:text-stone-950 disabled:opacity-40 motion-reduce:transition-none"
            >
              {addLabel}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
