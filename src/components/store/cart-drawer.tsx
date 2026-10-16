"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, X, ChevronDown, ChevronUp, RotateCcw, ShieldCheck, Truck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { buttonClasses } from "@/components/ui/button";
import { cartSubtotal, useStore, type CartLine } from "@/lib/store";
import { getCartLineAvailability, getCartLineImage, type CartRecommendation } from "@/lib/cart-ui";
import { cn, formatAed } from "@/lib/utils";
import { CartRecoveryBanner, ReservationTimer, useCartCopy } from "./cart-status";
import { useLocalizedHref } from "@/lib/use-localized-href";

const FREE_SHIPPING_THRESHOLD = 300;

function CartItemRow({ line }: { line: CartLine }) {
  const copy = useCartCopy();
  const localize = useLocalizedHref();
  const [editing, setEditing] = useState(false);
  const updateQuantity = useStore((state) => state.updateQuantity);
  const removeFromCart = useStore((state) => state.removeFromCart);
  const updateCartVariant = useStore((state) => state.updateCartVariant);
  const product = line.product;
  const availability = getCartLineAvailability(line);

  const handleVariantChange = (newSize: string, newColor: string) => {
    if (newSize === line.size && newColor === line.color) return;
    updateCartVariant(product.slug, line.size, line.color, newSize, newColor);
  };

  return (
    <div className="border-b border-[var(--border)] pb-5 last:border-b-0 last:pb-0">
      <div className="flex gap-4">
        <Link href={localize(`/product/${product.slug}`)} className="storefront-product-media relative aspect-[3/4] w-20 shrink-0 overflow-hidden sm:w-24">
          <Image src={getCartLineImage(line)} alt={product.name} fill sizes="96px" className="object-cover" />
        </Link>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Link href={localize(`/product/${product.slug}`)} className="line-clamp-2 text-sm font-medium leading-5 hover:underline sm:text-[15px]">
                {product.name}
              </Link>
              <p className="mt-1 text-xs text-[var(--muted)]">{line.color} / {line.size}</p>
            </div>
            <button onClick={() => removeFromCart(product.slug, line.size, line.color)} aria-label={copy.removeItem} className="btn btn-ghost btn-icon btn-sm btn-round -me-2 -mt-1 text-[var(--muted)]">
              <X className="size-4" />
            </button>
          </div>
          <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3">
            <div className="flex items-center gap-3">
              <div className="card flex h-9 items-center">
                <button type="button" className="grid h-full w-9 place-items-center text-[var(--muted)] hover:text-[var(--foreground)]" onClick={() => updateQuantity(product.slug, line.quantity - 1, line.size, line.color)} aria-label={copy.decreaseQuantity}>
                  <Minus className="size-3" />
                </button>
                <span className="min-w-6 text-center text-xs font-medium tabular-nums">{line.quantity}</span>
                <button type="button" disabled={!availability.canIncrease} className="grid h-full w-9 place-items-center text-[var(--muted)] hover:text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-30" onClick={() => updateQuantity(product.slug, line.quantity + 1, line.size, line.color)} aria-label={copy.increaseQuantity}>
                  <Plus className="size-3" />
                </button>
              </div>
              {product.variants?.length ? (
                <button onClick={() => setEditing(!editing)} className="inline-flex items-center gap-0.5 text-xs text-[var(--muted)] underline underline-offset-4 hover:text-[var(--foreground)]">
                  {copy.editStyle}
                  {editing ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                </button>
              ) : null}
            </div>
            <p className="text-sm font-medium">{formatAed((product.salePrice ?? product.price) * line.quantity)}</p>
          </div>
          {availability.allowsBackorder ? (
            <p className="mt-1 text-[11px] note-warn">{copy.availableOnBackorder}</p>
          ) : availability.isLowStock ? (
            <p className="mt-1 text-[11px] note-warn">{copy.onlyLeft} {availability.stock} {copy.left}</p>
          ) : null}
        </div>
      </div>

      {editing ? (
        <div className="storefront-expand-in card mt-3 space-y-3 p-3">
          <div>
            <span className="eyebrow eyebrow-muted">{copy.color}</span>
            <div className="mt-1 flex flex-wrap gap-0.5">
              {product.colors.map((c) => (
                <button key={c} onClick={() => handleVariantChange(line.size, c)} aria-pressed={line.color === c} title={c} aria-label={c} className="swatch swatch-sm">
                  <span style={{ backgroundColor: product.colorHex?.[c] ?? "#B8B2A7" }} />
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className="eyebrow eyebrow-muted">{copy.size}</span>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {product.sizes.map((s) => {
                const variant = product.variants?.find((v) => v.color.name === line.color && v.size.name === s);
                const disabled = variant ? variant.stock <= 0 && !variant.allowBackorder : false;
                return (
                  <button key={s} disabled={disabled} onClick={() => handleVariantChange(s, line.color)} aria-pressed={line.size === s} className="chip chip-sm">
                    {s}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CartRecommendations({ onAdd }: { onAdd?: () => void }) {
  const copy = useCartCopy();
  const localize = useLocalizedHref();
  const [products, setProducts] = useState<CartRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const cart = useStore((state) => state.cart);
  const cartSlugs = useMemo(() => new Set(cart.map((line) => line.product.slug)), [cart]);

  useEffect(() => {
    const fetchRecs = async () => {
      try {
        const res = await fetch("/api/search?q=");
        if (res.ok) {
          const data = await res.json();
          setProducts((data.products || []).filter((product: CartRecommendation) => !cartSlugs.has(product.slug)));
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
    <div className="border-t border-[var(--border)] pt-5">
      <p className="eyebrow eyebrow-muted">{copy.completeTheLook}</p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {products.slice(0, 2).map((prod, index) => (
          <Link key={prod.id} href={localize(`/product/${prod.slug}`)} onClick={onAdd} className="group/rec block min-w-0">
            <div className="storefront-product-media relative aspect-[3/4] overflow-hidden">
              <Image src={prod.image || "/images/campaign/accessories-still.webp"} alt={prod.name} fill sizes="200px" priority={index === 0} className="object-cover transition duration-500 group-hover/rec:scale-[1.02]" />
            </div>
            <p className="mt-2 truncate text-xs font-medium">{prod.name}</p>
            <p className="text-xs text-[var(--muted)]">{formatAed(prod.price)}</p>
          </Link>
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
  const isFreeShippingUnlocked = subtotal >= FREE_SHIPPING_THRESHOLD || coupon?.freeShipping;
  const progress = isFreeShippingUnlocked ? 100 : Math.min((subtotal / FREE_SHIPPING_THRESHOLD) * 100, 100);
  const discount = coupon?.discount ?? 0;
  const shippingFee = isFreeShippingUnlocked ? 0 : 25;
  const total = Math.max(0, subtotal - discount) + shippingFee;
  const count = cart.reduce((sum, line) => sum + line.quantity, 0);

  return (
    <Dialog.Root open={cartOpen} onOpenChange={setCartOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="storefront-overlay fixed inset-0 z-[110] bg-[var(--scrim)] backdrop-blur-sm motion-reduce:transition-none" />
        <Dialog.Content className="storefront-drawer-right storefront-panel fixed end-0 top-0 z-[110] flex h-dvh w-full max-w-md flex-col bg-[var(--surface)] text-[var(--foreground)] focus-visible:outline-none">
          <Dialog.Description className="sr-only">{copy.reviewCartDescription}</Dialog.Description>

          <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-5">
            <div>
              <Dialog.Title className="display-md">{copy.yourBag}</Dialog.Title>
              {count > 0 ? <p className="mt-1 text-xs text-[var(--muted)]">{count} {count === 1 ? "piece" : "pieces"}</p> : null}
            </div>
            <Dialog.Close aria-label="Close cart" className="btn btn-soft btn-icon btn-sm btn-round">
              <X className="size-4" />
            </Dialog.Close>
          </div>

          <ReservationTimer onExpiredChange={setReservationExpired} />
          <CartRecoveryBanner />

          {cart.length > 0 ? (
            <div className="border-b border-[var(--border)] px-6 py-4">
              <div className="flex justify-between text-xs text-[var(--muted)]">
                <span className="inline-flex items-center gap-2"><Truck className="size-3.5 text-[var(--accent-text)]" />{isFreeShippingUnlocked ? copy.freeUaeShippingUnlocked : `${formatAed(FREE_SHIPPING_THRESHOLD - subtotal)} ${copy.toFreeUaeShipping}`}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-[var(--card)]">
                <div className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-500 ease-out motion-reduce:transition-none" style={{ width: `${progress}%` }} />
              </div>
            </div>
          ) : null}

          <div className="flex-1 overflow-y-auto px-6 py-5">
            {lastRemovedLine ? (
              <div role="status" className="card mb-4 flex items-center justify-between gap-3 px-4 py-3 text-xs">
                <span className="min-w-0 truncate">{copy.removed} {lastRemovedLine.product.name} ({lastRemovedLine.color} / {lastRemovedLine.size})</span>
                <button onClick={undoRemove} className="inline-flex shrink-0 items-center gap-1 font-semibold text-[var(--accent-text)] underline underline-offset-4">
                  <RotateCcw className="size-3" />
                  {copy.undo}
                </button>
              </div>
            ) : null}

            {cart.length === 0 ? (
              <div className="flex min-h-full flex-col gap-8 pt-6">
                <div>
                  <p className="display-md">{copy.yourBagEmpty}</p>
                  <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{copy.emptyBagBody}</p>
                  <Dialog.Close asChild>
                    <Link href={localize("/shop")} className={buttonClasses({ variant: "primary", className: "mt-6" })}>
                      {copy.shopVelora}
                    </Link>
                  </Dialog.Close>
                </div>
                <CartRecommendations onAdd={() => setCartOpen(false)} />
              </div>
            ) : (
              <div className="space-y-6">
                <div className="storefront-stagger space-y-5">
                  {cart.map((line) => (
                    <CartItemRow key={`${line.product.slug}-${line.size}-${line.color}`} line={line} />
                  ))}
                </div>
                <CartRecommendations onAdd={() => setCartOpen(false)} />
              </div>
            )}
          </div>

          {cart.length > 0 ? (
            <div className="border-t border-[var(--border)] px-6 py-5">
              <dl className="space-y-1.5 text-sm text-[var(--muted)]">
                <div className="flex justify-between"><dt>{copy.subtotal}</dt><dd className="text-[var(--foreground)]">{formatAed(subtotal)}</dd></div>
                {discount > 0 ? <div className="flex justify-between note-ok"><dt>{copy.discount}</dt><dd>-{formatAed(discount)}</dd></div> : null}
                <div className="flex justify-between"><dt>{copy.shipping}</dt><dd className="text-[var(--foreground)]">{shippingFee === 0 ? copy.free : formatAed(shippingFee)}</dd></div>
                <div className="flex justify-between border-t border-[var(--border)] pt-3 text-base font-medium text-[var(--foreground)]"><dt>{copy.estimatedTotal}</dt><dd>{formatAed(total)}</dd></div>
              </dl>
              <div className="mt-4 grid gap-2">
                {reservationExpired || reservationError ? (
                  <button type="button" disabled className="btn btn-primary btn-lg btn-block">{copy.inventoryCheckRequired}</button>
                ) : (
                  <Dialog.Close asChild>
                    <Link href={localize("/checkout")} className={buttonClasses({ variant: "primary", size: "lg", block: true })}>
                      {copy.proceedToCheckout}
                    </Link>
                  </Dialog.Close>
                )}
                <Dialog.Close asChild>
                  <Link href={localize("/cart")} className={cn(buttonClasses({ variant: "secondary", block: true }))}>
                    {copy.viewAndEditBag}
                  </Link>
                </Dialog.Close>
              </div>
              <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-[var(--muted)]"><ShieldCheck className="size-3.5 text-[var(--accent-text)]" />Secure checkout · Card, Apple Pay, split payments</p>
            </div>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
