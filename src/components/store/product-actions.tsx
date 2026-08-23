"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Heart, LoaderCircle, Minus, PackageCheck, Plus, Ruler, ShieldCheck, Truck, X } from "lucide-react";
import type { Product } from "@/lib/catalog";
import { formatCartReservationError } from "@/lib/cart-ui";
import { cartCopy, localeFromPathname, localizedPath, productCopy } from "@/lib/i18n";
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
  const cartLabels = cartCopy[locale];
  const [internalSize, setInternalSize] = useState(product.sizes[0]);
  const [internalColor, setInternalColor] = useState(product.colors[0]);
  const [qty, setQty] = useState(1);
  const [status, setStatus] = useState<"idle" | "adding" | "added" | "error">("idle");
  const [alertEmail, setAlertEmail] = useState("");
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [alertLoading, setAlertLoading] = useState(false);
  const [alertState, setAlertState] = useState<"idle" | "success" | "existing" | "error">("idle");
  const [stickyBar, setStickyBar] = useState(false);
  const controlsRef = useRef<HTMLDivElement>(null);
  const color = selectedColor ?? internalColor;
  const size = selectedSize ?? internalSize;
  const addToCart = useStore((state) => state.addToCart);
  const reservationError = useStore((state) => state.cartReservationError);
  const reservationErrorLabel = reservationError
    ? formatCartReservationError(reservationError, cartLabels)
    : null;
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
  const mobileBarPrice = formatAed(unitPrice * effectiveQty, locale);
  const confidenceItems = [
    {
      label: copy.fastDelivery,
      detail: copy.fastDeliveryDetail,
      icon: Truck,
    },
    {
      label: copy.returnsWindow,
      detail: copy.returnsWindowDetail,
      icon: PackageCheck,
    },
    {
      label: copy.secureCheckout,
      detail: copy.secureCheckoutDetail,
      icon: ShieldCheck,
    },
    {
      label: copy.fitSupport,
      detail: product.fitSummary?.trim() || copy.fitSupportDetail,
      icon: Ruler,
    },
  ];

  useEffect(() => {
    const updateStickyBar = () => {
      const controls = controlsRef.current;
      if (!controls) return;
      const rect = controls.getBoundingClientRect();
      const lowerContentTop = Array.from(document.querySelectorAll("[data-pdp-lower-content]"))
        .reduce((top, element) => Math.min(top, element.getBoundingClientRect().top), Number.POSITIVE_INFINITY);
      const footer = document.querySelector("footer");
      const footerTop = footer?.getBoundingClientRect().top ?? Number.POSITIVE_INFINITY;
      const lowerPageIsActive = Math.min(lowerContentTop, footerTop) < 220;
      const purchaseControlsAreLeaving = rect.top < Math.min(360, window.innerHeight * 0.42);
      setStickyBar(purchaseControlsAreLeaving && !lowerPageIsActive);
    };

    updateStickyBar();
    window.addEventListener("scroll", updateStickyBar, { passive: true });
    window.addEventListener("resize", updateStickyBar);
    return () => {
      window.removeEventListener("scroll", updateStickyBar);
      window.removeEventListener("resize", updateStickyBar);
    };
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
    router.push(localizedPath("/checkout", locale));
  }

  async function submitAlert() {
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
          type: "BACK_IN_STOCK",
          email: alertEmail,
          productId: product.id,
          variantId: selectedVariant?.id,
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

  async function removeAlert() {
    setAlertLoading(true);
    try {
      const response = await fetch("/api/product-alerts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "BACK_IN_STOCK", email: alertEmail, productId: product.id, variantId: selectedVariant?.id }),
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
          : canBackorder
            ? copy.preorder
            : copy.addToBag;

  return (
    <div ref={controlsRef} id="purchase-options" className="space-y-3 scroll-mt-24">
      <div>
        <div className="mb-1 flex items-center justify-between text-sm">
          <span className="font-medium">{copy.color}</span>
          <span className="text-[var(--muted)]">{color}</span>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label={copy.chooseColor}>
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
                className="storefront-action grid size-10 place-items-center outline-none transition hover:scale-105 focus-visible:ring-2 focus-visible:ring-[var(--foreground)] focus-visible:ring-offset-2 motion-reduce:transition-none"
              >
                <span
                  data-product-color-frame
                  aria-hidden="true"
                  className={`grid size-7 place-items-center border ${
                    selected ? "border-[var(--foreground)]" : "border-[var(--border)]"
                  }`}
                >
                  <span
                    className="block size-5 border border-black/10"
                    style={{ backgroundColor: hex }}
                  />
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between text-sm">
          <span className="font-medium">{copy.size}{preferredSize && product.sizes.includes(preferredSize) ? ` · ${copy.saved} ${preferredSize}` : ""}</span>
          <Dialog.Root>
            <Dialog.Trigger asChild>
              <button
                type="button"
                className="storefront-action inline-flex min-h-10 items-center gap-1.5 px-2 text-xs text-[var(--muted)] underline underline-offset-4 hover:text-[var(--foreground)]"
              >
                <Ruler className="size-3.5" />
                {copy.sizeGuide}
              </button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="storefront-overlay fixed inset-0 z-[110] bg-black/55 backdrop-blur-sm" />
              <Dialog.Content className="storefront-drawer-right storefront-panel fixed inset-y-0 end-0 z-[110] w-full max-w-lg overflow-y-auto bg-[var(--surface)] p-5 text-[var(--foreground)] sm:p-6">
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
                    className="storefront-action storefront-icon-button grid size-10 place-items-center border border-[var(--border)] bg-[var(--hover)] hover:border-[var(--foreground)]"
                  >
                    <X className="size-5" />
                  </Dialog.Close>
                </div>
                <div className="storefront-framed mt-8 overflow-x-auto bg-[var(--background)]">
                  <table className="w-full border-collapse text-start text-sm">
                    <thead>
                      <tr className="border-b border-[var(--border)] bg-[var(--card)] text-xs uppercase tracking-wider text-[var(--muted)]">
                        <th className="px-3 py-3">{copy.size}</th>
                        <th className="px-3 py-3">{copy.bust}</th>
                        <th className="px-3 py-3">{copy.waist}</th>
                        <th className="px-3 py-3">{copy.hip}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {product.sizes.map((name, index) => (
                        <tr key={name} className="border-b border-[var(--border)]">
                          <td className="px-3 py-4 font-medium">{name}</td>
                          <td className="px-3 py-4">{78 + index * 5}-{82 + index * 5}</td>
                          <td className="px-3 py-4">{60 + index * 5}-{64 + index * 5}</td>
                          <td className="px-3 py-4">{86 + index * 5}-{90 + index * 5}</td>
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
                className="storefront-action group relative grid min-h-10 min-w-10 place-items-center px-0.5 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-35"
              >
                <span
                  data-product-size-box
                  className={`grid h-8 min-w-8 place-items-center whitespace-nowrap border px-3 transition-colors ${
                    effectiveSize === name
                      ? "border-[var(--accent)] bg-[var(--accent)] text-[#17262D]"
                      : "border-[var(--border)] bg-[var(--surface)] group-hover:border-[var(--accent)]"
                  }`}
                >
                  {name}
                </span>
                {disabled ? (
                  <span className="absolute left-1/2 top-1/2 h-px w-7 -translate-x-1/2 -translate-y-1/2 -rotate-45 bg-current" />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {availability.needsRecovery ? (
        <div className="storefront-framed p-4 text-sm leading-6">
          <p className="font-medium text-[var(--foreground)]">
            {copy.size} {size} {copy.selectedUnavailable} {color}.
          </p>
          {availability.availableSizesForColor.length ? (
            <div className="mt-3">
              <p className="text-[var(--muted)]">{copy.availableInColor}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {availability.availableSizesForColor.map((name) => (
                <button
                  type="button"
                  key={name}
                  aria-label={`${copy.selectAvailableSize} ${name}`}
                    onClick={() => {
                      setInternalSize(name);
                      setQty(1);
                      onSizeChange?.(name);
                    }}
                    className="storefront-action min-h-10 border border-[var(--accent)] bg-[var(--accent)] px-3 text-xs font-semibold text-[#17262D] transition hover:brightness-95 motion-reduce:transition-none"
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          {availability.sameSizeAlternativeColors.length ? (
            <div className="mt-3">
              <p className="text-[var(--muted)]">{copy.sameSizeAvailable}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {availability.sameSizeAlternativeColors.map((name) => (
                  <button
                    type="button"
                    key={name}
                    aria-label={`Select ${name} in size ${size}`}
                    onClick={() => selectColor(name, size)}
                    className="storefront-action min-h-10 border border-[var(--border)] px-3 text-xs font-semibold transition hover:border-[var(--foreground)] motion-reduce:transition-none"
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
        <span className="mb-1 block text-sm font-medium">{copy.quantity}</span>
        <div className="flex items-center gap-3">
          <div className="storefront-framed flex items-center">
            <button
              type="button"
              onClick={() => setQty(Math.max(1, effectiveQty - 1))}
              aria-label={copy.decreaseQuantity}
              className="storefront-action grid size-11 place-items-center hover:bg-[var(--hover)]"
            >
              <Minus className="size-4" />
            </button>
            <span className="w-10 text-center text-sm font-medium">{effectiveQty}</span>
            <button
              type="button"
              onClick={() => setQty(effectiveQty + 1)}
              disabled={Number.isFinite(maxSelectableQty) && effectiveQty >= maxSelectableQty}
              aria-label={copy.increaseQuantity}
              className="storefront-action grid size-11 place-items-center hover:bg-[var(--hover)] disabled:opacity-35"
            >
              <Plus className="size-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={addSelectedVariant}
            disabled={outOfStock || status === "adding"}
            aria-live="polite"
            className="storefront-action h-11 flex-1 bg-[var(--accent)] text-sm font-semibold text-[#17262D] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:transition-none"
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
            className="storefront-action grid size-11 shrink-0 place-items-center text-[var(--foreground)] hover:text-[#d12b2b]"
          >
            <Heart className={`size-5 ${inWishlist ? "fill-[#d12b2b] text-[#d12b2b]" : ""}`} />
          </button>
        </div>

        {outOfStock ? (
          <p className="mt-2 border-s-2 border-amber-500 ps-2 text-xs font-medium text-amber-800">
            {copy.outOfStockNote}
          </p>
        ) : lowStock ? (
          <p className="mt-2 border-s-2 border-amber-500 ps-2 text-xs font-medium text-amber-800">
            {copy.onlyLeftIn} {stockLimit} {copy.leftInPrefix} {color}, {copy.sizePrefix} {effectiveSize}.
          </p>
        ) : canBackorder ? (
          <p className="mt-2 border-s-2 border-amber-500 ps-2 text-xs font-medium text-amber-800">
            {backorderMessage}
            {backorderCapacity != null ? ` ${backorderCapacity} available for backorder.` : null}
          </p>
        ) : (
          <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
            <Check className="size-3.5" /> {copy.inStockReady}
          </p>
        )}
        {status === "error" ? (
          <p className="mt-2 text-xs text-red-600" role="alert">{copy.addToCartError}</p>
        ) : null}
        {reservationError ? (
          <p
            className={`storefront-expand-in mt-2 text-xs ${reservationErrorLabel?.tone === "warning" ? "text-amber-700" : "text-red-600"}`}
            role="alert"
          >
            {reservationErrorLabel?.title}
          </p>
        ) : null}

        {outOfStock ? <div className="storefront-railed mt-4 grid gap-2 px-3 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
            {copy.backInStockAlert}
          </p>
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
            <label htmlFor="product-alert-email" className="sr-only">{copy.emailAddress}</label>
            <input
              id="product-alert-email"
              type="email"
              value={alertEmail}
              onChange={(event) => setAlertEmail(event.target.value)}
              placeholder={copy.emailAddress}
              suppressHydrationWarning
              className="storefront-action h-10 border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            />
            <button
              type="button"
              onClick={() => void submitAlert()}
              disabled={alertLoading || !selectedVariant?.id}
              className="storefront-action h-10 border border-[var(--accent)] bg-[var(--accent)] px-4 text-xs font-semibold uppercase tracking-[0.1em] text-[#17262D] hover:brightness-95 disabled:opacity-45"
            >
              {alertLoading ? copy.saving : copy.notifyMe}
            </button>
          </div>
          {alertMessage ? <div role={alertState === "error" ? "alert" : "status"} className={`storefront-expand-in flex flex-wrap items-center justify-between gap-2 text-xs leading-5 ${alertState === "error" ? "text-red-600" : alertState === "success" || alertState === "existing" ? "text-emerald-600" : "text-[var(--muted)]"}`}><span>{alertMessage}</span>{alertState === "success" || alertState === "existing" ? <button type="button" onClick={() => void removeAlert()} className="font-semibold underline underline-offset-4">{copy.removeAlert}</button> : null}</div> : null}
        </div> : null}

        <button
          type="button"
          onClick={buyNow}
          disabled={outOfStock}
          className="storefront-action mt-3 h-11 w-full border border-[var(--accent)] bg-[var(--background)] text-sm font-semibold uppercase tracking-[0.12em] text-[var(--foreground)] transition hover:bg-[var(--accent)] hover:text-[#17262D] disabled:opacity-40"
        >
          {copy.buyNow}
        </button>

        <div className="storefront-railed mt-4 grid gap-x-5 gap-y-3 px-3 py-4 sm:grid-cols-2">
          {confidenceItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="flex items-start gap-2.5">
                  <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-[var(--radius-control)] bg-[var(--accent)] text-[#17262D]">
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs font-semibold text-[var(--foreground)]">{item.label}</span>
                    <span className="mt-0.5 block text-[11px] leading-4 text-[var(--muted)]">{item.detail}</span>
                  </span>
              </div>
            );
          })}
        </div>

        <details className="storefront-railed mt-4 py-3 text-sm">
          <summary className="storefront-action cursor-pointer px-4 font-semibold">{copy.materialsAndCare}</summary>
          <div className="mt-3 grid gap-4 px-4 pb-1 text-xs leading-5 text-[var(--muted)] sm:grid-cols-2">
            <p><strong className="block text-[var(--foreground)]">{copy.materials}</strong>{product.fabric}</p>
            <p><strong className="block text-[var(--foreground)]">{copy.care}</strong>{product.care}</p>
          </div>
        </details>
      </div>

      <div
        className="storefront-bottom-bar fixed inset-x-0 bottom-0 z-30 border-t border-[var(--border)] bg-[var(--surface)]/96 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 shadow-[0_-10px_30px_rgba(0,0,0,0.14)] backdrop-blur sm:hidden"
        data-visible={stickyBar ? "true" : "false"}
        aria-hidden={!stickyBar}
        inert={!stickyBar}
        aria-label="Mobile purchase summary"
      >
          <div className="mb-2 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => controlsRef.current?.scrollIntoView({ block: "start", behavior: "smooth" })}
              className="storefront-action min-w-0 text-left"
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
            className="storefront-action h-12 w-full bg-[var(--accent)] text-sm font-semibold text-[#17262D] transition hover:brightness-95 disabled:opacity-40 motion-reduce:transition-none"
          >
            {status === "added"
              ? copy.addedToBag
              : outOfStock
                ? copy.outOfStock
                : canBackorder
                  ? copy.preorder
                  : copy.addToBag}
          </button>
        </div>

      <div
        className="storefront-bottom-bar fixed inset-x-0 bottom-0 z-30 hidden border-t border-[var(--border)] bg-[var(--surface)]/96 py-3 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] backdrop-blur sm:block"
        data-visible={stickyBar ? "true" : "false"}
        aria-hidden={!stickyBar}
        inert={!stickyBar}
      >
          <div className="storefront-container flex items-center gap-5">
            <div className="min-w-0">
              <p className="truncate font-medium">{product.name}</p>
              <p className="text-xs text-[var(--muted)]">{color} / {effectiveSize}</p>
            </div>
            <p className="ms-auto text-sm font-medium">{formatAed(unitPrice, locale)}</p>
            <button
              type="button"
              onClick={addSelectedVariant}
              disabled={outOfStock || status === "adding"}
              className="storefront-action h-11 min-w-48 bg-[var(--accent)] px-6 text-sm font-semibold text-[#17262D] transition hover:brightness-95 disabled:opacity-40 motion-reduce:transition-none"
            >
              {addLabel}
            </button>
          </div>
        </div>
    </div>
  );
}
