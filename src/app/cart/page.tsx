"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Minus, Plus, X, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cartSubtotal, useStore, useStoreHydrated, type CartLine } from "@/lib/store";
import {
  getCartLineAvailability,
  getCartLineImage,
  type CartRecommendation,
} from "@/lib/cart-ui";
import { cartCopy, localeFromPathname } from "@/lib/i18n";
import { formatAed } from "@/lib/utils";
import { CartRecoveryBanner, ReservationTimer } from "@/components/store/cart-status";
import { useLocalizedHref } from "@/lib/use-localized-href";
import { ContextualSupport } from "@/components/store/contextual-support";

function useCartCopy() {
  const pathname = usePathname();
  return cartCopy[localeFromPathname(pathname)];
}

function CartItemRow({ line }: { line: CartLine }) {
  const copy = useCartCopy();
  const localize = useLocalizedHref();
  const [editing, setEditing] = useState(false);
  const updateQuantity = useStore((state) => state.updateQuantity);
  const removeFromCart = useStore((state) => state.removeFromCart);
  const updateCartVariant = useStore((state) => state.updateCartVariant);

  const product = line.product;
  const sizes = product.sizes;
  const colors = product.colors;

  const handleVariantChange = (newSize: string, newColor: string) => {
    if (newSize === line.size && newColor === line.color) return;

    updateCartVariant(product.slug, line.size, line.color, newSize, newColor);
  };
  const availability = getCartLineAvailability(line);

  return (
    <div className="flex min-w-0 flex-col border-b border-[var(--border)] pb-6 last:border-b-0 last:pb-0">
      <div className="flex min-w-0 gap-3 sm:gap-6">
        <div className="storefront-action relative size-20 shrink-0 overflow-hidden bg-[var(--card)] sm:size-24">
          <Image
            src={getCartLineImage(line)}
            alt={line.product.name}
            fill
            sizes="(max-width: 640px) 80px, 96px"
            className="object-cover"
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex min-w-0 items-start justify-between gap-2 sm:gap-3">
            <div className="min-w-0 flex-1">
              <Link
                href={localize(`/product/${line.product.slug}`)}
                className="block overflow-hidden break-words text-base font-medium leading-6 hover:underline sm:text-lg sm:leading-7 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]"
              >
                {line.product.name}
              </Link>
              <p className="mt-1 truncate text-sm text-[var(--muted)]">
                {line.color} / {line.size}
              </p>
            </div>
            <button
              onClick={() => removeFromCart(line.product.slug, line.size, line.color)}
              aria-label={copy.removeItem}
              className="storefront-action grid size-9 shrink-0 place-items-center text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--foreground)] motion-reduce:transition-none"
            >
              <X className="size-4" />
            </button>
          </div>
          
          <div className="mt-auto flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-4">
              <div className="storefront-action flex h-9 items-center border border-[var(--border)]">
                <button
                  type="button"
                  className="storefront-action grid h-9 w-9 place-items-center text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--foreground)]"
                  onClick={() =>
                    updateQuantity(line.product.slug, line.quantity - 1, line.size, line.color)
                  }
                  aria-label={copy.decreaseQuantity}
                >
                  <Minus className="size-3" />
                </button>
                <span className="min-w-6 text-center text-sm font-semibold">{line.quantity}</span>
                <button
                  type="button"
                  disabled={!availability.canIncrease}
                  className="storefront-action grid h-9 w-9 place-items-center text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-30"
                  onClick={() =>
                    updateQuantity(line.product.slug, line.quantity + 1, line.size, line.color)
                  }
                  aria-label={copy.increaseQuantity}
                >
                  <Plus className="size-3" />
                </button>
              </div>

              {product.variants?.length ? (
                <button
                  onClick={() => setEditing(!editing)}
                  className="storefront-action flex min-h-9 items-center gap-0.5 whitespace-nowrap text-xs font-medium text-[var(--muted)] underline hover:text-[var(--foreground)]"
                >
                  {copy.editStyle}
                  {editing ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                </button>
              ) : null}
            </div>
            <p className="shrink-0 whitespace-nowrap text-base font-semibold">
              {formatAed((line.product.salePrice ?? line.product.price) * line.quantity)}
            </p>
          </div>
          {availability.allowsBackorder ? (
            <p className="text-xs text-[var(--sale)]">{copy.availableOnBackorder}</p>
          ) : availability.isLowStock ? (
            <p className="text-xs text-[var(--sale)]">{copy.onlyLeft} {availability.stock} {copy.left}</p>
          ) : null}
        </div>
      </div>

      {editing && (
        <div className="storefront-expand-in storefront-stagger storefront-panel-row mt-4 max-w-md space-y-3 border border-[var(--border)] p-4">
          <div>
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[var(--muted)]">{copy.color}</span>
            <div className="flex flex-wrap gap-2.5">
              {colors.map((c) => (
                <button
                  key={c}
                  onClick={() => handleVariantChange(line.size, c)}
                  style={{ backgroundColor: product.colorHex?.[c] ?? "#888888" }}
                  className={`storefront-action size-7 border-2 hover:scale-105 ${
                    line.color === c ? "border-[var(--foreground)] ring-1 ring-[var(--foreground)]" : "border-[var(--paper)] shadow-sm"
                  }`}
                  title={c}
                />
              ))}
            </div>
          </div>
          <div>
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[var(--muted)]">{copy.size}</span>
            <div className="flex flex-wrap gap-2">
              {sizes.map((s) => {
                const variant = product.variants?.find(
                  (v) => v.color.name === line.color && v.size.name === s
                );
                const disabled = variant ? (variant.stock <= 0 && !variant.allowBackorder) : false;
                return (
                  <button
                    key={s}
                    disabled={disabled}
                    onClick={() => handleVariantChange(s, line.color)}
                    className={`storefront-action h-9 px-3 text-xs border font-semibold ${
                      line.size === s
                        ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--on-accent)]"
                        : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)]"
                    } disabled:opacity-30 disabled:cursor-not-allowed`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PageRecommendations() {
  const localize = useLocalizedHref();
  const copy = useCartCopy();
  const [products, setProducts] = useState<CartRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const cart = useStore((state) => state.cart);
  const cartSlugs = useMemo(
    () => new Set(cart.map((line) => line.product.slug)),
    [cart],
  );

  useEffect(() => {
    const fetchRecs = async () => {
      try {
        const res = await fetch("/api/search?q=");
        if (res.ok) {
          const data = await res.json();
          setProducts(
            (data.products || []).filter(
              (product: CartRecommendation) => !cartSlugs.has(product.slug),
            ),
          );
        }
      } catch {
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };
    fetchRecs();
  }, [cartSlugs]);

  if (loading || !products.length) return null;

  return (
    <div className="mt-10 border-t border-[var(--border)] pt-8">
      <h2 className="display-md">{copy.completeTheLookTitle}</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">{copy.pairingsSubtitle}</p>
      
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {products.slice(0, 4).map((prod) => (
          <div key={prod.id} className="card storefront-action group flex flex-col hover:shadow-md">
            <div className="storefront-product-media relative aspect-[3/4] w-full overflow-hidden">
              <Image
                src={prod.image}
                alt={prod.name}
                fill
                sizes="(min-width: 1024px) 30vw, 50vw"
                className="object-cover transition duration-300 group-hover:scale-105 motion-reduce:transition-none"
              />
            </div>
            <div className="flex flex-1 flex-col justify-between pt-3">
              <div>
                <p className="text-xs uppercase tracking-wider text-[var(--muted)]">{prod.category}</p>
                <h3 className="mt-1 truncate font-semibold text-[var(--foreground)]">{prod.name}</h3>
                <p className="mt-1 text-sm text-[var(--muted)]">{formatAed(prod.price)}</p>
              </div>
              <Link
                href={localize(`/product/${prod.slug}`)}
                className="btn btn-secondary btn-sm btn-block mt-4"
              >
                {copy.viewDetails}
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CartPage() {
  const copy = useCartCopy();
  const localize = useLocalizedHref();
  const hydrated = useStoreHydrated();
  const cart = useStore((state) => state.cart);
  const lastRemovedLine = useStore((state) => state.lastRemovedLine);
  const undoRemove = useStore((state) => state.undoRemove);
  const coupon = useStore((state) => state.coupon);
  const couponError = useStore((state) => state.couponError);
  const applyCoupon = useStore((state) => state.applyCouponCode);
  const removeCoupon = useStore((state) => state.removeCoupon);
  const note = useStore((state) => state.customerNote);
  const setNote = useStore((state) => state.setCustomerNote);
  const reservationError = useStore((state) => state.cartReservationError);
  
  const [couponInput, setCouponInput] = useState("");
  const [loadingCoupon, setLoadingCoupon] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const [reservationExpired, setReservationExpired] = useState(false);

  const subtotal = cartSubtotal(cart);
  const isFreeShippingUnlocked = subtotal >= 300 || coupon?.freeShipping;
  const progress = isFreeShippingUnlocked ? 100 : Math.min((subtotal / 300) * 100, 100);

  const discount = coupon?.discount ?? 0;
  const shipping = isFreeShippingUnlocked ? 0 : 25;
  const total = Math.max(0, subtotal - discount) + shipping;

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    setLoadingCoupon(true);
    await applyCoupon(couponInput);
    setLoadingCoupon(false);
    setCouponInput("");
  };

  const emptyCartPanel = (
    <div className="card grid gap-6 p-5 sm:grid-cols-[minmax(0,1fr)_240px] sm:items-center sm:p-7">
      <div className="max-w-xl">
        <p className="display-md">{copy.yourCartEmpty}</p>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
          Build your first edit from sculpting leggings, breathable bras, and warm-weather layers.
        </p>
      </div>
      <div className="grid gap-3 sm:justify-items-end">
        <Link
          href={localize("/shop")}
          className="btn btn-primary"
        >
          {copy.shopCatalog}
        </Link>
        <Link href={localize("/shop?sort=popular")} className="btn btn-link btn-sm">
          Best sellers
        </Link>
      </div>
    </div>
  );

  return (
    <section className="storefront-container py-8 sm:py-10">
      <div className="flex flex-col gap-4 border-b border-[var(--border)] pb-5 sm:flex-row sm:items-baseline sm:justify-between">
        <h1 className="display-lg">{copy.cartTitle}</h1>
        <div className="w-full max-w-sm sm:w-auto">
          <ReservationTimer onExpiredChange={setReservationExpired} />
        </div>
      </div>

      <div className={`mt-6 grid gap-10 ${hydrated && cart.length ? "lg:grid-cols-[1fr_380px]" : ""}`}>
        <div className="space-y-6">
          {lastRemovedLine && (
            <div role="status" className="storefront-expand-in storefront-framed flex items-center justify-between px-4 py-3 text-sm">
              <span className="text-[var(--foreground)] font-medium">
                {copy.removed} {lastRemovedLine.product.name} ({lastRemovedLine.color} / {lastRemovedLine.size})
              </span>
              <button
                onClick={undoRemove}
                className="storefront-action flex min-h-9 items-center gap-1.5 font-bold text-[var(--accent-text)] underline hover:text-[var(--foreground)]"
              >
                <RotateCcw className="size-4" />
                {copy.undoRemove}
              </button>
            </div>
          )}
          <CartRecoveryBanner />

          {!hydrated || !cart.length ? (
            emptyCartPanel
          ) : (
            <div className="card space-y-6 p-4 sm:p-6">
              <div className="border-b border-[var(--border)] pb-4">
                <div className="flex justify-between text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">
                  <span>
                    {isFreeShippingUnlocked
                      ? copy.freeUaeShippingUnlocked
                      : `${formatAed(300 - subtotal)} ${copy.toFreeUaeShipping}`}
                  </span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--card)]">
                  <div
                    className="h-full bg-[var(--accent)] transition-[width] duration-500 ease-out motion-reduce:transition-none"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              <div className="space-y-6 pt-2">
                {cart.map((line) => (
                  <CartItemRow key={`${line.product.slug}-${line.size}-${line.color}`} line={line} />
                ))}
              </div>
            </div>
          )}

          {hydrated && cart.length ? (
            <div className="grid gap-6 sm:grid-cols-2">
              {/* Order Note */}
              <div className="card h-fit p-5">
                <button
                  onClick={() => setShowNote(!showNote)}
                  className="flex min-h-10 w-full items-center justify-between text-base font-medium"
                >
                  <span>{copy.orderNoteGiftMessage}</span>
                  <span className="text-xs font-normal text-[var(--muted)]">{showNote ? `${copy.hide} -` : `${copy.add} +`}</span>
                </button>
                {showNote && (
                  <div className="storefront-expand-in mt-3">
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder={copy.deliveryGuidelinesPlaceholder}
                      rows={4}
                    className="field text-sm"
                    />
                  </div>
                )}
              </div>

              {/* Coupon */}
              <div className="card h-fit p-5">
                <h2 className="mb-3 text-base font-medium">{copy.promoCouponCode}</h2>
                {coupon ? (
                  <div role="status" className="storefront-action flex items-center justify-between border border-[var(--accent-soft)] bg-[var(--accent-soft)] px-4 py-2.5 text-sm text-[var(--accent-text)]">
                    <span className="font-semibold">{coupon.code} {copy.applied} (-{formatAed(coupon.discount)})</span>
                    <button onClick={removeCoupon} className="font-bold text-[var(--accent-text)] underline transition hover:text-[var(--foreground)] motion-reduce:transition-none">
                      {copy.remove}
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                      <input
                        placeholder={copy.enterCouponCode}
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                        className="field uppercase"
                      />
                      <button
                        onClick={handleApplyCoupon}
                        disabled={loadingCoupon || !couponInput.trim()}
                        className="btn btn-primary"
                      >
                        {copy.apply}
                      </button>
                    </div>
                    {couponError && <p role="alert" className="mt-2 text-xs font-medium text-[var(--sale)]">{couponError}</p>}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>

        {hydrated && cart.length ? (
          <aside className="card h-fit p-6">
            <h2 className="display-md">{copy.summary}</h2>
            <div className="mt-6 space-y-3 border-b border-[var(--border)] pb-5 text-sm text-[var(--muted)]">
              <div className="flex justify-between">
                <span>{copy.itemsSubtotal}</span>
                <span className="font-medium text-[var(--foreground)]">{formatAed(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-[var(--accent-text)]">
                  <span>{copy.promoDiscount}</span>
                  <span className="font-medium">-{formatAed(discount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>{copy.shipping}</span>
                <span className="font-medium text-[var(--foreground)]">
                  {shipping === 0 ? copy.free : formatAed(shipping)}
                </span>
              </div>
              <p className="pt-1 text-xs leading-5 text-[var(--muted)]">{copy.shippingEstimateNote}</p>
            </div>

            <div className="mt-4 space-y-4">
              <div className="flex justify-between text-lg font-semibold">
                <span>{copy.estimatedTotal}</span>
                <span>{formatAed(total)}</span>
              </div>

              {reservationExpired || reservationError ? (
                <Button disabled size="lg" block>
                  {copy.inventoryCheckRequired}
                </Button>
              ) : (
                <Link href={localize("/checkout")} className="block">
                  <Button size="lg" block>
                    {copy.proceedToCheckout}
                  </Button>
                </Link>
              )}

              <p className="text-center text-xs text-[var(--muted)] mt-4">
                {copy.checkoutDisclaimer}
              </p>
            </div>
            <div className="mt-5"><ContextualSupport context="cart" compact /></div>
          </aside>
        ) : null}
      </div>

      {hydrated ? <PageRecommendations /> : null}
    </section>
  );
}
