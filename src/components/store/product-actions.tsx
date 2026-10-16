"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Heart, LoaderCircle, Minus, PackageCheck, Plus, Ruler, ShieldCheck, Truck, X } from "lucide-react";
import type { Product } from "@/lib/catalog";
import { formatCartReservationError } from "@/lib/cart-ui";
import { cartCopy, localeFromPathname, localizedPath, productCopy } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { cn, formatAed } from "@/lib/utils";
import { getVariantAvailability } from "@/lib/variant-availability";

const fallbackColorHex: Record<string, string> = {
  Black: "#2C2824",
  White: "#f1ece3",
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
  const reservationErrorLabel = reservationError ? formatCartReservationError(reservationError, cartLabels) : null;
  const wishlist = useStore((state) => state.wishlist);
  const toggleWishlist = useStore((state) => state.toggleWishlist);
  const inWishlist = wishlist.includes(product.slug);
  const availability = useMemo(() => getVariantAvailability(product, color, size), [color, product, size]);
  const colorVariants = availability.colorVariants;
  const effectiveSize = availability.effectiveSize;
  const selectedVariant = availability.selectedVariant;
  const canBackorder = availability.canBackorder;
  const outOfStock = availability.outOfStock;
  const stockLimit = selectedVariant?.stock ?? product.stock;
  const lowStockThreshold = selectedVariant?.lowStockThreshold ?? 5;
  const backorderCapacity = selectedVariant?.backorderAvailable;
  const maxSelectableQty = canBackorder ? backorderCapacity ?? Number.POSITIVE_INFINITY : Math.max(stockLimit, 1);
  const lowStock = !outOfStock && !canBackorder && stockLimit > 0 && stockLimit <= lowStockThreshold;
  const effectiveQty = Math.min(qty, maxSelectableQty);
  const backorderMessage =
    selectedVariant?.backorderMessage?.trim() ||
    (selectedVariant?.backorderShipsAt ? `Ships after ${new Date(selectedVariant.backorderShipsAt).toLocaleDateString()}.` : copy.backorderNote);
  const unitPrice = product.salePrice ?? product.price;
  const mobileBarPrice = formatAed(unitPrice * effectiveQty, locale);
  const confidenceItems = [
    { label: copy.fastDelivery, detail: copy.fastDeliveryDetail, icon: Truck },
    { label: copy.returnsWindow, detail: copy.returnsWindowDetail, icon: PackageCheck },
    { label: copy.secureCheckout, detail: copy.secureCheckoutDetail, icon: ShieldCheck },
    { label: copy.fitSupport, detail: product.fitSummary?.trim() || copy.fitSupportDetail, icon: Ruler },
  ];

  useEffect(() => {
    const updateStickyBar = () => {
      const controls = controlsRef.current;
      if (!controls) return;
      const rect = controls.getBoundingClientRect();
      const lowerContentTop = Array.from(document.querySelectorAll("[data-pdp-lower-content]")).reduce(
        (top, element) => Math.min(top, element.getBoundingClientRect().top),
        Number.POSITIVE_INFINITY,
      );
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
        body: JSON.stringify({ type: "BACK_IN_STOCK", email: alertEmail, productId: product.id, variantId: selectedVariant?.id }),
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
    const availableSize =
      product.variants?.find(
        (variant) =>
          variant.color.name === name &&
          (!preferredAvailableSize || variant.size.name === preferredAvailableSize) &&
          (variant.stock > 0 || variant.allowBackorder),
      )?.size.name ??
      product.variants?.find((variant) => variant.color.name === name && (variant.stock > 0 || variant.allowBackorder))?.size.name;
    if (availableSize) setInternalSize(availableSize);
    setQty(1);
    setInternalColor(name);
    onColorChange?.(name, availableSize);
  }

  function pickSize(name: string) {
    setInternalSize(name);
    setQty(1);
    onSizeChange?.(name);
  }

  function sizeState(name: string) {
    if (!product.variants?.length) return { exists: true, available: product.stock > 0 };
    const variant = colorVariants.find((item) => item.size.name === name);
    return { exists: Boolean(variant), available: Boolean(variant && (variant.stock > 0 || variant.allowBackorder)) };
  }

  const addLabel = outOfStock
    ? copy.outOfStock
    : status === "adding"
      ? copy.adding
      : status === "added"
        ? copy.addedToBag
        : canBackorder
          ? copy.preorder
          : copy.addToBag;

  const sectionLabel = "flex items-center justify-between text-sm";

  return (
    <div ref={controlsRef} id="purchase-options" className="space-y-7 scroll-mt-24">
      <div>
        <div className={sectionLabel}>
          <span className="font-medium">{copy.color}</span>
          <span className="text-[var(--muted)]">{color}</span>
        </div>
        <div className="mt-2 flex flex-wrap gap-1" role="group" aria-label={copy.chooseColor}>
          {product.colors.map((name) => {
            const hex = product.colorHex?.[name] ?? fallbackColorHex[name] ?? "#B8B2A7";
            return (
              <button
                type="button"
                key={name}
                onClick={() => selectColor(name)}
                aria-label={`${copy.select} ${name}`}
                aria-pressed={color === name}
                title={name}
                className="swatch focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
              >
                <span aria-hidden="true" style={{ backgroundColor: hex }} />
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className={sectionLabel}>
          <span className="font-medium">
            {copy.size}
            {preferredSize && product.sizes.includes(preferredSize) ? <span className="text-[var(--muted)]"> · {copy.saved} {preferredSize}</span> : null}
          </span>
          <Dialog.Root>
            <Dialog.Trigger asChild>
              <button type="button" className="inline-flex min-h-8 items-center gap-1.5 text-xs text-[var(--muted)] underline underline-offset-4 hover:text-[var(--foreground)]">
                <Ruler className="size-3.5" />
                {copy.sizeGuide}
              </button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="storefront-overlay fixed inset-0 z-[110] bg-[var(--scrim)] backdrop-blur-sm" />
              <Dialog.Content className="storefront-drawer-right storefront-panel fixed inset-y-0 end-0 z-[110] w-full max-w-lg overflow-y-auto bg-[var(--surface)] p-6 text-[var(--foreground)] sm:p-8">
                <div className="flex items-start justify-between gap-5">
                  <div>
                    <Dialog.Title className="display-md">{product.category} {copy.sizeGuide.toLowerCase()}</Dialog.Title>
                    <Dialog.Description className="mt-3 text-sm leading-6 text-[var(--muted)]">{copy.sizeGuideDescription}</Dialog.Description>
                  </div>
                  <Dialog.Close aria-label={copy.closeSizeGuide} className="btn btn-soft btn-icon btn-sm btn-round shrink-0">
                    <X className="size-4" />
                  </Dialog.Close>
                </div>
                <div className="card mt-8 overflow-x-auto">
                  <table className="w-full border-collapse text-start text-sm">
                    <thead>
                      <tr className="border-b border-[var(--border)] bg-[var(--card)] text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
                        <th className="px-4 py-3 font-semibold">{copy.size}</th>
                        <th className="px-4 py-3 font-semibold">{copy.bust}</th>
                        <th className="px-4 py-3 font-semibold">{copy.waist}</th>
                        <th className="px-4 py-3 font-semibold">{copy.hip}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {product.sizes.map((name, index) => (
                        <tr key={name} className="border-b border-[var(--border)] last:border-b-0">
                          <td className="px-4 py-3.5 font-medium">{name}</td>
                          <td className="px-4 py-3.5">{78 + index * 5}-{82 + index * 5}</td>
                          <td className="px-4 py-3.5">{60 + index * 5}-{64 + index * 5}</td>
                          <td className="px-4 py-3.5">{86 + index * 5}-{90 + index * 5}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-6 text-sm leading-6 text-[var(--muted)]">
                  {product.category.toLowerCase().includes("legging") ? copy.compressiveFitNote : copy.regularFitNote}
                </p>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
        <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label={copy.chooseSize}>
          {product.sizes.map((name) => {
            const state = sizeState(name);
            const disabled = !state.exists || !state.available;
            return (
              <button
                type="button"
                key={name}
                onClick={() => pickSize(name)}
                disabled={disabled}
                aria-label={`${name}${disabled ? ` ${copy.unavailable}` : ""}`}
                aria-pressed={effectiveSize === name}
                className="chip"
              >
                {name}
              </button>
            );
          })}
        </div>
      </div>

      {availability.needsRecovery ? (
        <div className="card p-4 text-sm leading-6">
          <p className="font-medium">
            {copy.size} {size} {copy.selectedUnavailable} {color}.
          </p>
          {availability.availableSizesForColor.length ? (
            <div className="mt-3">
              <p className="text-[var(--muted)]">{copy.availableInColor}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {availability.availableSizesForColor.map((name) => (
                  <button type="button" key={name} aria-label={`${copy.selectAvailableSize} ${name}`} onClick={() => pickSize(name)} className="chip chip-sm">
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
                  <button type="button" key={name} aria-label={`Select ${name} in size ${size}`} onClick={() => selectColor(name, size)} className="chip chip-sm">
                    {name}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <div>
        <div className="flex items-stretch gap-3">
          <div className="card flex h-14 items-center" aria-label={copy.quantity}>
            <button type="button" onClick={() => setQty(Math.max(1, effectiveQty - 1))} aria-label={copy.decreaseQuantity} className="grid h-full w-11 place-items-center hover:bg-[var(--hover)]">
              <Minus className="size-4" />
            </button>
            <span className="w-8 text-center text-sm font-medium tabular-nums">{effectiveQty}</span>
            <button
              type="button"
              onClick={() => setQty(effectiveQty + 1)}
              disabled={Number.isFinite(maxSelectableQty) && effectiveQty >= maxSelectableQty}
              aria-label={copy.increaseQuantity}
              className="grid h-full w-11 place-items-center hover:bg-[var(--hover)] disabled:opacity-35"
            >
              <Plus className="size-4" />
            </button>
          </div>
          <button type="button" onClick={addSelectedVariant} disabled={outOfStock || status === "adding"} aria-live="polite" className="btn btn-primary btn-lg flex-1">
            {status === "adding" ? <LoaderCircle className="size-4 animate-spin" /> : status === "added" ? <Check className="size-4" /> : null}
            {addLabel}
          </button>
          <button
            type="button"
            onClick={() => toggleWishlist(product.slug, selectedVariant ? { variantId: selectedVariant.id, color, size: effectiveSize } : { color, size: effectiveSize })}
            aria-label={inWishlist ? copy.removeFromWishlist : copy.addToWishlist}
            aria-pressed={inWishlist}
            className="btn btn-soft btn-icon h-14 w-14 shrink-0"
          >
            <Heart className={cn("size-5", inWishlist && "fill-[var(--sale)] text-[var(--sale)]")} />
          </button>
        </div>
        <button type="button" onClick={buyNow} disabled={outOfStock} className="btn btn-secondary btn-lg btn-block mt-3">
          {copy.buyNow}
        </button>

        <div className="mt-3 min-h-5 text-xs font-medium" aria-live="polite">
          {outOfStock ? (
            <p className="note-warn">{copy.outOfStockNote}</p>
          ) : lowStock ? (
            <p className="note-warn">{copy.onlyLeftIn} {stockLimit} {copy.leftInPrefix} {color}, {copy.sizePrefix} {effectiveSize}.</p>
          ) : canBackorder ? (
            <p className="note-warn">{backorderMessage}{backorderCapacity != null ? ` ${backorderCapacity} available for backorder.` : null}</p>
          ) : (
            <p className="note-ok inline-flex items-center gap-1.5"><Check className="size-3.5" /> {copy.inStockReady}</p>
          )}
          {status === "error" ? <p className="mt-1 note-warn" role="alert">{copy.addToCartError}</p> : null}
          {reservationError ? <p className="mt-1 note-warn" role="alert">{reservationErrorLabel?.title}</p> : null}
        </div>

        {outOfStock ? (
          <div className="card mt-4 grid gap-3 p-4">
            <p className="eyebrow eyebrow-muted">{copy.backInStockAlert}</p>
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
              <label htmlFor="product-alert-email" className="sr-only">{copy.emailAddress}</label>
              <input id="product-alert-email" type="email" value={alertEmail} onChange={(event) => setAlertEmail(event.target.value)} placeholder={copy.emailAddress} suppressHydrationWarning className="field" />
              <button type="button" onClick={() => void submitAlert()} disabled={alertLoading || !selectedVariant?.id} className="btn btn-primary">
                {alertLoading ? copy.saving : copy.notifyMe}
              </button>
            </div>
            {alertMessage ? (
              <div role={alertState === "error" ? "alert" : "status"} className={cn("flex flex-wrap items-center justify-between gap-2 text-xs leading-5", alertState === "error" ? "note-warn" : "note-ok")}>
                <span>{alertMessage}</span>
                {alertState === "success" || alertState === "existing" ? (
                  <button type="button" onClick={() => void removeAlert()} className="font-semibold underline underline-offset-4">{copy.removeAlert}</button>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <ul className="grid gap-x-6 gap-y-4 border-t border-[var(--border)] pt-6 sm:grid-cols-2">
        {confidenceItems.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.label} className="flex items-start gap-3">
              <Icon className="mt-0.5 size-4 shrink-0 text-[var(--accent-text)]" />
              <span className="min-w-0">
                <span className="block text-sm font-medium">{item.label}</span>
                <span className="mt-0.5 block text-xs leading-5 text-[var(--muted)]">{item.detail}</span>
              </span>
            </li>
          );
        })}
      </ul>

      <details className="group border-y border-[var(--border)] py-4 text-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between font-medium">
          {copy.materialsAndCare}
          <Plus className="size-4 transition-transform group-open:rotate-45" />
        </summary>
        <div className="mt-4 grid gap-4 text-sm leading-6 text-[var(--muted)] sm:grid-cols-2">
          <p><strong className="block font-medium text-[var(--foreground)]">{copy.materials}</strong>{product.fabric}</p>
          <p><strong className="block font-medium text-[var(--foreground)]">{copy.care}</strong>{product.care}</p>
        </div>
      </details>

      {/* Mobile sticky purchase bar */}
      <div
        className="storefront-bottom-bar fixed inset-x-0 bottom-0 z-30 border-t border-[var(--border)] bg-[var(--surface)]/96 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 backdrop-blur sm:hidden"
        data-visible={stickyBar ? "true" : "false"}
        aria-hidden={!stickyBar}
        inert={!stickyBar}
        aria-label="Mobile purchase summary"
      >
        <div className="mb-2 flex items-center justify-between gap-4">
          <button type="button" onClick={() => controlsRef.current?.scrollIntoView({ block: "start", behavior: "smooth" })} className="min-w-0 text-left">
            <span className="block truncate text-sm font-medium">{product.name}</span>
            <span className="block truncate text-xs text-[var(--muted)]">{color} / {effectiveSize}{effectiveQty > 1 ? ` / Qty ${effectiveQty}` : ""}</span>
          </button>
          <span className="shrink-0 text-sm font-medium">{mobileBarPrice}</span>
        </div>
        <button type="button" onClick={addSelectedVariant} disabled={outOfStock || status === "adding"} className="btn btn-primary btn-block">
          {status === "added" ? copy.addedToBag : outOfStock ? copy.outOfStock : canBackorder ? copy.preorder : copy.addToBag}
        </button>
      </div>

      {/* Desktop sticky purchase bar */}
      <div
        className="storefront-bottom-bar fixed inset-x-0 bottom-0 z-30 hidden border-t border-[var(--border)] bg-[var(--surface)]/96 py-3 backdrop-blur sm:block"
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
          <button type="button" onClick={addSelectedVariant} disabled={outOfStock || status === "adding"} className="btn btn-primary min-w-48">
            {addLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
