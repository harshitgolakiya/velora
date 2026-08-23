"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, X, ChevronDown, ChevronUp, RotateCcw, ShieldCheck, Truck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cartSubtotal, useStore, type CartLine } from "@/lib/store";
import {
  getCartLineAvailability,
  getCartLineImage,
  type CartRecommendation,
} from "@/lib/cart-ui";
import { formatAed } from "@/lib/utils";
import { CartRecoveryBanner, ReservationTimer, useCartCopy } from "./cart-status";
import { useLocalizedHref } from "@/lib/use-localized-href";

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
    <div className="flex min-w-0 flex-col border-b border-[var(--border)] pb-4 last:border-b-0 last:pb-0">
      <div className="flex min-w-0 gap-3 sm:gap-4">
        <div className="relative size-16 shrink-0 overflow-hidden bg-[var(--card)] sm:size-20">
          <Image
            src={getCartLineImage(line)}
            alt={line.product.name}
            fill
            sizes="(max-width: 640px) 64px, 80px"
            className="object-cover"
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex min-w-0 items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <Link
                href={localize(`/product/${line.product.slug}`)}
                className="block overflow-hidden break-words text-sm font-medium leading-5 hover:underline sm:text-base sm:leading-6 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]"
              >
                {line.product.name}
              </Link>
              <p className="mt-0.5 truncate text-xs text-[var(--muted)]">
                {line.color} / {line.size}
              </p>
            </div>
            <button
              onClick={() => removeFromCart(line.product.slug, line.size, line.color)}
              aria-label={copy.removeItem}
              className="storefront-action grid size-8 shrink-0 place-items-center text-[var(--muted)] transition hover:bg-[var(--hover)] hover:text-[var(--foreground)] motion-reduce:transition-none"
            >
              <X className="size-4" />
            </button>
          </div>
          
          <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2">
            <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
              <div className="flex h-8 items-center border border-[var(--border)]">
                <button
                  type="button"
                  className="storefront-action grid h-8 w-8 place-items-center text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--foreground)]"
                  onClick={() =>
                    updateQuantity(line.product.slug, line.quantity - 1, line.size, line.color)
                  }
                  aria-label={copy.decreaseQuantity}
                >
                  <Minus className="size-3" />
                </button>
                <span className="min-w-5 text-center text-xs font-semibold">{line.quantity}</span>
                <button
                  type="button"
                  disabled={!availability.canIncrease}
                  className="storefront-action grid h-8 w-8 place-items-center text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-30"
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
                className="storefront-action flex min-h-8 items-center gap-0.5 whitespace-nowrap text-xs font-medium text-[var(--muted)] underline hover:text-[var(--foreground)]"
                >
                  {copy.editStyle}
                  {editing ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                </button>
              ) : null}
            </div>
            <p className="shrink-0 whitespace-nowrap text-end text-sm font-semibold">
              {formatAed((line.product.salePrice ?? line.product.price) * line.quantity)}
            </p>
          </div>
          {availability.allowsBackorder ? (
            <p className="mt-1 text-[11px] text-amber-700">{copy.availableOnBackorder}</p>
          ) : availability.isLowStock ? (
            <p className="mt-1 text-[11px] text-amber-700">
              {copy.onlyLeft} {availability.stock} {copy.left}
            </p>
          ) : null}
        </div>
      </div>

      {editing && (
        <div className="storefront-expand-in storefront-stagger storefront-panel-row mt-3 space-y-3 border border-[var(--border)] p-3">
          <div>
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">{copy.color}</span>
            <div className="flex flex-wrap gap-2">
              {colors.map((c) => (
                <button
                  key={c}
                  onClick={() => handleVariantChange(line.size, c)}
                  style={{ backgroundColor: product.colorHex?.[c] ?? "#888888" }}
                  className={`storefront-action size-6 border-2 transition hover:scale-105 motion-reduce:transition-none ${
                    line.color === c ? "border-[var(--foreground)] ring-1 ring-[var(--foreground)]" : "border-white shadow-sm"
                  }`}
                  title={c}
                />
              ))}
            </div>
          </div>
          <div>
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">{copy.size}</span>
            <div className="flex flex-wrap gap-1.5">
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
                    className={`h-7 px-2.5 text-xs border font-semibold transition ${
                      line.size === s
                        ? "border-[var(--accent)] bg-[var(--accent)] text-[#17262D]"
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

function CartRecommendations({ onAdd }: { onAdd?: () => void }) {
  const copy = useCartCopy();
  const localize = useLocalizedHref();
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
    <div className="border-t border-[var(--border)] bg-[var(--card)] px-4 py-4">
      <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--muted)]">{copy.completeTheLook}</p>
      <div className="space-y-3">
        {products.slice(0, 2).map((prod, index) => (
          <div key={prod.id} className="storefront-action storefront-panel-row flex items-center justify-between gap-3 border border-[var(--border)] p-2 text-xs">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="storefront-product-media relative size-12 shrink-0 overflow-hidden">
                <Image
                  src={prod.image || "/images/activewear-demo/active-duo.jpg"}
                  alt={prod.name}
                  fill
                  sizes="48px"
                  priority={index === 0}
                  style={{ objectPosition: "50% 68%" }}
                  className="object-cover"
                />
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold text-[var(--foreground)]">{prod.name}</p>
                <p className="mt-0.5 text-[var(--muted)]">{formatAed(prod.price)}</p>
              </div>
            </div>
            <Link
              href={localize(`/product/${prod.slug}`)}
              onClick={onAdd}
              className="storefront-action inline-flex min-h-10 shrink-0 items-center justify-center border border-[var(--accent)] px-3 text-[10px] font-bold uppercase tracking-wider hover:bg-[var(--accent)] hover:text-[#17262D]"
            >
              {copy.view}
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CartDrawer() {
  const copy = useCartCopy();
  const localize = useLocalizedHref();
  const cart = useStore((state) => state.cart);
  const cartOpen = useStore((state) => state.cartOpen);
  const setCartOpen = useStore((state) => state.setCartOpen);
  const lastRemovedLine = useStore((state) => state.lastRemovedLine);
  const undoRemove = useStore((state) => state.undoRemove);
  const coupon = useStore((state) => state.coupon);
  const reservationError = useStore((state) => state.cartReservationError);
  const [reservationExpired, setReservationExpired] = useState(false);
  
  const subtotal = cartSubtotal(cart);
  const isFreeShippingUnlocked = subtotal >= 300 || coupon?.freeShipping;
  const progress = isFreeShippingUnlocked ? 100 : Math.min((subtotal / 300) * 100, 100);

  const discount = coupon?.discount ?? 0;
  const total = Math.max(0, subtotal - discount);

  return (
    <Dialog.Root open={cartOpen} onOpenChange={setCartOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="storefront-overlay fixed inset-0 z-[110] bg-black/55 backdrop-blur-sm motion-reduce:transition-none" />
        <Dialog.Content className="storefront-drawer-right storefront-panel fixed end-0 top-0 z-[110] flex h-dvh w-full max-w-lg flex-col bg-[var(--surface)] text-[var(--foreground)] focus-visible:outline-none">
          <Dialog.Description className="sr-only">
            {copy.reviewCartDescription}
          </Dialog.Description>

          <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
            <div>
              <Dialog.Title className="font-serif text-2xl">{copy.yourBag}</Dialog.Title>
              {cart.length > 0 ? (
                <p className="mt-1 text-xs text-[var(--muted)]">{cart.length} {cart.length === 1 ? "piece" : "pieces"} reserved for checkout</p>
              ) : null}
            </div>
            <Dialog.Close aria-label="Close cart" className="storefront-action storefront-icon-button grid size-10 place-items-center border border-[var(--border)] bg-[var(--hover)] transition hover:border-[var(--foreground)] focus-visible:outline-none motion-reduce:transition-none">
              <X className="size-5" />
            </Dialog.Close>
          </div>

          <ReservationTimer onExpiredChange={setReservationExpired} />
          <CartRecoveryBanner />

          {cart.length > 0 ? (
            <div className="border-b border-[var(--border)] bg-[var(--card)]/45 px-5 py-4">
              <div className="flex justify-between text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                <span>
                  {isFreeShippingUnlocked
                    ? copy.freeUaeShippingUnlocked
                    : `${formatAed(300 - subtotal)} ${copy.toFreeUaeShipping}`}
                </span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden bg-[var(--card)]">
                <div
                  className="h-full bg-[var(--accent)] transition-[width] duration-500 ease-out motion-reduce:transition-none"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-[11px] font-medium text-[var(--muted)]">
                <span className="flex items-center gap-2">
                  <Truck className="size-3.5 text-[var(--accent)]" />
                  UAE delivery
                </span>
                <span className="flex items-center gap-2">
                  <ShieldCheck className="size-3.5 text-[var(--accent)]" />
                  Secure checkout
                </span>
              </div>
            </div>
          ) : null}

          <div className="flex-1 overflow-y-auto px-5 py-5">
            {lastRemovedLine && (
              <div role="status" className="mb-4 flex items-center justify-between border border-[var(--border)] bg-[var(--hover)] px-4 py-2 text-xs">
                <span className="text-[var(--foreground)] font-medium">
                  {copy.removed} {lastRemovedLine.product.name} ({lastRemovedLine.color} / {lastRemovedLine.size})
                </span>
                <button
                  onClick={undoRemove}
                  className="storefront-action flex items-center gap-1 font-bold text-[var(--accent)] underline transition hover:text-[var(--foreground)]"
                >
                  <RotateCcw className="size-3" />
                  {copy.undo}
                </button>
              </div>
            )}

            {cart.length === 0 ? (
              <div className="flex min-h-full flex-col gap-6 pt-4 text-start">
                <div className="max-w-sm">
                  <p className="text-2xl font-semibold">{copy.yourBagEmpty}</p>
                  <p className="mt-2 text-sm text-[var(--muted)]">
                    {copy.emptyBagBody}
                  </p>
                  <Dialog.Close asChild>
                    <Link
                      href={localize("/shop")}
                      className="storefront-action mt-6 inline-flex h-11 items-center border border-[var(--accent)] px-6 text-sm font-semibold uppercase tracking-wider text-[var(--accent-text)] transition hover:bg-[var(--accent)] hover:text-[#17262D] motion-reduce:transition-none"
                    >
                      {copy.shopVelora}
                    </Link>
                  </Dialog.Close>
                </div>
                <CartRecommendations onAdd={() => setCartOpen(false)} />
              </div>
            ) : (
            <div className="flex flex-col space-y-5">
                <div className="storefront-stagger space-y-4">
                  {cart.map((line) => (
                    <CartItemRow key={`${line.product.slug}-${line.size}-${line.color}`} line={line} />
                  ))}
                </div>
                
                <CartRecommendations onAdd={() => setCartOpen(false)} />
              </div>
            )}
          </div>

          {cart.length > 0 && (
            <div className="border-t border-[var(--border)] bg-[var(--surface)]">
              <div className="space-y-4 border-t border-[var(--border)] p-5">
                <div className="space-y-1.5 text-sm text-[var(--muted)]">
                  <div className="flex justify-between">
                    <span>{copy.subtotal}</span>
                    <span className="font-medium text-[var(--foreground)]">{formatAed(subtotal)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span>{copy.discount}</span>
                      <span className="font-medium">-{formatAed(discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>{copy.shipping}</span>
                    <span className="font-medium text-[var(--foreground)]">
                      {subtotal >= 300 || coupon?.freeShipping ? copy.free : "AED 25"}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-[var(--border)] pt-3 text-base font-semibold text-[var(--foreground)]">
                    <span>{copy.estimatedTotal}</span>
                    <span>{formatAed(total + (subtotal >= 300 || coupon?.freeShipping ? 0 : 25))}</span>
                  </div>
                </div>

                {reservationExpired || reservationError ? (
                  <Button disabled className="h-12 w-full text-sm font-bold uppercase tracking-wider">
                    {copy.inventoryCheckRequired}
                  </Button>
                ) : (
                  <Dialog.Close asChild>
                    <Link href={localize("/checkout")} className="block">
                      <Button className="h-12 w-full text-sm font-bold uppercase tracking-wider">
                        {copy.proceedToCheckout}
                      </Button>
                    </Link>
                  </Dialog.Close>
                )}
                <Dialog.Close asChild>
                  <Link href={localize("/cart")} className="storefront-action flex h-11 items-center justify-center border border-[var(--border)] text-sm font-semibold hover:border-[var(--foreground)] hover:bg-[var(--hover)]">
                    {copy.viewAndEditBag}
                  </Link>
                </Dialog.Close>
              </div>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
