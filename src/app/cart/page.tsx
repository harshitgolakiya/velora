"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Minus, Plus, X, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cartSubtotal, useStore, type CartLine } from "@/lib/store";
import {
  getCartLineAvailability,
  getCartLineImage,
  type CartRecommendation,
} from "@/lib/cart-ui";
import { cartCopy, localeFromPathname } from "@/lib/i18n";
import { formatAed } from "@/lib/utils";
import { CartRecoveryBanner, ReservationTimer } from "@/components/store/cart-drawer";

function useCartCopy() {
  const pathname = usePathname();
  return cartCopy[localeFromPathname(pathname)];
}

function CartItemRow({ line }: { line: CartLine }) {
  const copy = useCartCopy();
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
        <div className="relative size-20 shrink-0 overflow-hidden bg-[var(--card)] sm:size-24">
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
                href={`/product/${line.product.slug}`}
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
              className="grid size-8 shrink-0 place-items-center text-[var(--muted)] transition hover:text-[var(--foreground)] motion-reduce:transition-none"
            >
              <X className="size-4" />
            </button>
          </div>
          
          <div className="mt-auto flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-4">
              <div className="flex h-9 items-center border border-[var(--border)]">
                <button
                  type="button"
                  className="px-3 py-1 text-[var(--muted)] hover:text-[var(--foreground)]"
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
                  className="px-3 py-1 text-[var(--muted)] hover:text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-30"
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
                  className="flex items-center gap-0.5 whitespace-nowrap text-xs font-medium text-[var(--muted)] underline transition hover:text-[var(--foreground)] motion-reduce:transition-none"
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
            <p className="text-xs text-amber-700">{copy.availableOnBackorder}</p>
          ) : availability.isLowStock ? (
            <p className="text-xs text-amber-700">{copy.onlyLeft} {availability.stock} {copy.left}</p>
          ) : null}
        </div>
      </div>

      {editing && (
        <div className="mt-4 max-w-md space-y-3 border border-[var(--border)] bg-[var(--card)] p-4">
          <div>
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[var(--muted)]">{copy.color}</span>
            <div className="flex flex-wrap gap-2.5">
              {colors.map((c) => (
                <button
                  key={c}
                  onClick={() => handleVariantChange(line.size, c)}
                  style={{ backgroundColor: product.colorHex?.[c] ?? "#888888" }}
                  className={`size-6 border-2 transition hover:scale-105 motion-reduce:transition-none ${
                    line.color === c ? "border-[var(--foreground)] ring-1 ring-[var(--foreground)]" : "border-white shadow-sm"
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
                    className={`h-8 px-3 text-xs border font-semibold transition ${
                      line.size === s
                        ? "border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)]"
                        : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--muted)]"
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
    <div className="mt-16 border-t border-[var(--border)] pt-10">
      <h2 className="font-serif text-3xl">{copy.completeTheLookTitle}</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">{copy.pairingsSubtitle}</p>
      
      <div className="mt-8 grid gap-6 sm:grid-cols-2 md:grid-cols-3">
        {products.slice(0, 3).map((prod) => (
          <div key={prod.id} className="group flex flex-col overflow-hidden border border-[var(--border)] bg-[var(--surface)] transition hover:shadow-md motion-reduce:transition-none">
            <div className="relative aspect-square w-full overflow-hidden bg-[var(--card)]">
              <Image
                src={prod.image}
                alt={prod.name}
                fill
                sizes="(min-width: 1024px) 30vw, 50vw"
                className="object-cover transition duration-300 group-hover:scale-105 motion-reduce:transition-none"
              />
            </div>
            <div className="flex flex-1 flex-col justify-between p-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-[var(--muted)]">{prod.category}</p>
                <h3 className="mt-1 truncate font-semibold text-[var(--foreground)]">{prod.name}</h3>
                <p className="mt-1 text-sm text-[var(--muted)]">{formatAed(prod.price)}</p>
              </div>
              <Link
                href={`/product/${prod.slug}`}
                className="mt-4 block w-full border border-[var(--foreground)] py-2 text-center text-xs font-bold uppercase tracking-wider transition hover:bg-[var(--foreground)] hover:text-[var(--background)] motion-reduce:transition-none"
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

  return (
    <section className="mx-auto max-w-[1440px] px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 border-b border-[var(--border)] pb-6 sm:flex-row sm:items-baseline sm:justify-between">
        <h1 className="font-serif text-5xl sm:text-6xl">{copy.cartTitle}</h1>
        <div className="w-full max-w-sm sm:w-auto">
          <ReservationTimer onExpiredChange={setReservationExpired} />
        </div>
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          {lastRemovedLine && (
            <div role="status" className="flex items-center justify-between border border-[var(--border)] bg-[var(--hover)] px-4 py-3 text-sm">
              <span className="text-[var(--foreground)] font-medium">
                {copy.removed} {lastRemovedLine.product.name} ({lastRemovedLine.color} / {lastRemovedLine.size})
              </span>
              <button
                onClick={undoRemove}
                className="flex items-center gap-1.5 font-bold text-[var(--accent)] underline transition hover:text-[var(--foreground)] motion-reduce:transition-none"
              >
                <RotateCcw className="size-4" />
                {copy.undoRemove}
              </button>
            </div>
          )}
          <CartRecoveryBanner />

          {cart.length ? (
            <div className="space-y-6 border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6">
              <div className="border-b border-[var(--border)] pb-4">
                <div className="flex justify-between text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">
                  <span>
                    {isFreeShippingUnlocked
                      ? copy.freeUaeShippingUnlocked
                      : `${formatAed(300 - subtotal)} ${copy.toFreeUaeShipping}`}
                  </span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden bg-[var(--card)]">
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
          ) : (
            <div className="border border-dashed border-[var(--border)] bg-[var(--surface)] py-24 text-center">
              <p className="font-serif text-3xl">{copy.yourCartEmpty}</p>
              <p className="mt-2 text-sm text-[var(--muted)] max-w-md mx-auto px-4">
                {copy.emptyCartBody}
              </p>
              <Link
                href="/shop"
                className="mt-6 inline-flex h-11 items-center border border-[var(--foreground)] bg-[var(--foreground)] px-6 text-sm font-semibold uppercase tracking-wider text-[var(--background)] transition hover:bg-[var(--accent)] hover:text-[#111315] motion-reduce:transition-none"
              >
                {copy.shopCatalog}
              </Link>
            </div>
          )}

          {cart.length ? (
            <div className="grid gap-6 sm:grid-cols-2">
              {/* Order Note */}
              <div className="h-fit border border-[var(--border)] bg-[var(--surface)] p-5">
                <button
                  onClick={() => setShowNote(!showNote)}
                  className="flex w-full items-center justify-between font-serif text-lg text-[var(--foreground)] transition hover:text-[var(--accent)] focus-visible:outline-none motion-reduce:transition-none"
                >
                  <span>{copy.orderNoteGiftMessage}</span>
                  <span className="text-xs font-normal text-[var(--muted)]">{showNote ? `${copy.hide} -` : `${copy.add} +`}</span>
                </button>
                {showNote && (
                  <div className="mt-3">
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder={copy.deliveryGuidelinesPlaceholder}
                      rows={4}
                      className="w-full border border-[var(--border)] bg-[var(--background)] p-2.5 text-xs outline-none focus:border-[var(--accent)]"
                    />
                  </div>
                )}
              </div>

              {/* Coupon */}
              <div className="h-fit border border-[var(--border)] bg-[var(--surface)] p-5">
                <h2 className="mb-3 font-serif text-lg text-[var(--foreground)]">{copy.promoCouponCode}</h2>
                {coupon ? (
                  <div role="status" className="flex items-center justify-between border border-emerald-500/20 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-700">
                    <span className="font-semibold">{coupon.code} {copy.applied} (-{formatAed(coupon.discount)})</span>
                    <button onClick={removeCoupon} className="font-bold text-emerald-700 underline transition hover:text-[var(--foreground)] motion-reduce:transition-none">
                      {copy.remove}
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="flex gap-2">
                      <input
                        placeholder={copy.enterCouponCode}
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                        className="min-w-0 flex-1 border border-[var(--border)] px-3 py-2 text-sm uppercase outline-none focus:border-[var(--accent)]"
                      />
                      <button
                        onClick={handleApplyCoupon}
                        disabled={loadingCoupon || !couponInput.trim()}
                        className="border border-[var(--foreground)] bg-[var(--foreground)] px-5 py-2 text-xs font-bold uppercase tracking-wider text-[var(--background)] transition hover:bg-[var(--accent)] hover:text-[#111315] disabled:opacity-50 motion-reduce:transition-none"
                      >
                        {copy.apply}
                      </button>
                    </div>
                    {couponError && <p role="alert" className="mt-2 text-xs font-medium text-red-600">{couponError}</p>}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>

        {cart.length ? (
          <aside className="h-fit border border-[var(--border)] bg-[var(--surface)] p-6">
            <h2 className="font-serif text-3xl">{copy.summary}</h2>
            <div className="mt-6 space-y-3 border-b border-[var(--border)] pb-5 text-sm text-[var(--muted)]">
              <div className="flex justify-between">
                <span>{copy.itemsSubtotal}</span>
                <span className="font-medium text-[var(--foreground)]">{formatAed(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-emerald-700">
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
            </div>

            <div className="mt-4 space-y-4">
              <div className="flex justify-between text-lg font-semibold">
                <span>{copy.estimatedTotal}</span>
                <span>{formatAed(total)}</span>
              </div>

              {reservationExpired || reservationError ? (
                <Button disabled className="h-12 w-full text-sm font-bold uppercase tracking-wider">
                  {copy.inventoryCheckRequired}
                </Button>
              ) : (
                <Link href="/checkout" className="block">
                  <Button className="h-12 w-full text-sm font-bold uppercase tracking-wider">
                    {copy.proceedToCheckout}
                  </Button>
                </Link>
              )}

              <p className="text-center text-xs text-[var(--muted)] mt-4">
                {copy.checkoutDisclaimer}
              </p>
            </div>
          </aside>
        ) : null}
      </div>

      <PageRecommendations />
    </section>
  );
}
