"use client";

import { useEffect, useState } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Product } from "./catalog";

export type CartLine = {
  product: Product;
  variantId?: string;
  size: string;
  color: string;
  quantity: number;
};

export type WishlistIntent = {
  variantId?: string;
  color?: string;
  size?: string;
};

export type StoreCoupon = {
  code: string;
  discount: number;
  freeShipping: boolean;
  type: string;
  value: number;
  minimumAmount: number;
};

export type CartSyncStatus = "idle" | "syncing" | "synced" | "error";

type PersistedStoreState = Partial<
  Pick<
    StoreState,
    | "cart"
    | "cartSessionKey"
    | "wishlist"
    | "wishlistIntents"
    | "cartExpiresAt"
    | "coupon"
    | "customerNote"
  >
>;

type StoreState = {
  cart: CartLine[];
  cartSessionKey: string;
  cartReservationError?: string;
  cartSyncStatus: CartSyncStatus;
  cartRecoveryNotice?: "restored";
  wishlist: string[];
  wishlistIntents: Record<string, WishlistIntent>;
  cartOpen: boolean;
  cartExpiresAt?: string;
  coupon?: StoreCoupon;
  couponError?: string;
  customerNote?: string;
  lastRemovedLine?: CartLine;
  addToCart: (product: Product, options?: { size?: string; color?: string; quantity?: number }) => void;
  updateQuantity: (slug: string, quantity: number, size?: string, color?: string) => void;
  updateCartVariant: (
    slug: string,
    currentSize: string,
    currentColor: string,
    nextSize: string,
    nextColor: string,
  ) => void;
  removeFromCart: (slug: string, size?: string, color?: string) => void;
  toggleWishlist: (slug: string, intent?: WishlistIntent) => void;
  setWishlist: (slugs: string[], intents?: Record<string, WishlistIntent>) => void;
  setWishlistIntent: (slug: string, intent: WishlistIntent) => void;
  setCartOpen: (open: boolean) => void;
  setCartSessionKey: (cartSessionKey: string) => void;
  startNewCartSession: (cartSessionKey: string) => void;
  setCartReservationError: (cartReservationError?: string) => void;
  setCartSyncStatus: (cartSyncStatus: CartSyncStatus, cartRecoveryNotice?: "restored") => void;
  replaceCart: (payload: {
    cart: CartLine[];
    cartSessionKey: string;
    cartExpiresAt?: string;
  }) => void;
  clearCart: () => void;
  applyCouponCode: (code: string) => Promise<void>;
  removeCoupon: () => void;
  setCartExpiresAt: (expiresAt?: string) => void;
  setCustomerNote: (note: string) => void;
  undoRemove: () => void;
};

const recalculateCoupon = (
  coupon: StoreCoupon | undefined,
  cart: CartLine[],
): StoreCoupon | undefined => {
  if (!coupon) return undefined;
  const subtotal = cart.reduce(
    (total, line) => total + (line.product.salePrice ?? line.product.price) * line.quantity,
    0,
  );
  if (subtotal < coupon.minimumAmount) return undefined;
  const discount =
    coupon.type === "PERCENTAGE"
      ? Math.min(subtotal, subtotal * (coupon.value / 100))
      : coupon.type === "FIXED"
        ? Math.min(subtotal, coupon.value)
        : 0;
  return { ...coupon, discount };
};

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      cart: [],
      cartSessionKey: "",
      cartReservationError: undefined,
      cartSyncStatus: "idle",
      cartRecoveryNotice: undefined,
      wishlist: [],
      wishlistIntents: {},
      cartOpen: false,
      cartExpiresAt: undefined,
      coupon: undefined,
      couponError: undefined,
      customerNote: "",
      lastRemovedLine: undefined,
      addToCart: (product, options) =>
        set((state) => {
          const size = options?.size ?? product.sizes[0];
          const color = options?.color ?? product.colors[0];
          const quantity = options?.quantity ?? 1;
          const variant = product.variants?.find(
            (candidate) =>
              candidate.size.name === size && candidate.color.name === color,
          );
          const existing = state.cart.find(
            (line) =>
              line.product.slug === product.slug &&
              line.size === size &&
              line.color === color,
          );

          let newCart;
          if (existing) {
            newCart = state.cart.map((line) =>
              line === existing ? { ...line, quantity: line.quantity + quantity } : line,
            );
          } else {
            newCart = [
              ...state.cart,
              { product, variantId: variant?.id, size, color, quantity },
            ];
          }

          return {
            cartOpen: true,
            cart: newCart,
            coupon: recalculateCoupon(state.coupon, newCart),
          };
        }),
      updateQuantity: (slug, quantity, size, color) =>
        set((state) => {
          const newCart = state.cart
            .map((line) =>
              line.product.slug === slug &&
              (!size || line.size === size) &&
              (!color || line.color === color)
                ? { ...line, quantity }
                : line,
            )
            .filter((line) => line.quantity > 0);
          return {
            cart: newCart,
            coupon: recalculateCoupon(state.coupon, newCart),
          };
        }),
      updateCartVariant: (slug, currentSize, currentColor, nextSize, nextColor) =>
        set((state) => {
          const source = state.cart.find(
            (line) =>
              line.product.slug === slug &&
              line.size === currentSize &&
              line.color === currentColor,
          );
          if (!source || (currentSize === nextSize && currentColor === nextColor)) {
            return {};
          }

          const variant = source.product.variants?.find(
            (candidate) =>
              candidate.size.name === nextSize &&
              candidate.color.name === nextColor,
          );
          if (!variant || (variant.stock <= 0 && !variant.allowBackorder)) {
            return {};
          }

          const targetQuantity = variant.allowBackorder
            ? source.quantity
            : Math.min(source.quantity, variant.stock);
          const existingTarget = state.cart.find(
            (line) =>
              line !== source &&
              line.product.slug === slug &&
              line.size === nextSize &&
              line.color === nextColor,
          );

          const withoutSource = state.cart.filter((line) => line !== source);
          const newCart = existingTarget
            ? withoutSource.map((line) =>
                line === existingTarget
                  ? {
                      ...line,
                      variantId: variant.id,
                      quantity: variant.allowBackorder
                        ? line.quantity + targetQuantity
                        : Math.min(line.quantity + targetQuantity, variant.stock),
                    }
                  : line,
              )
            : [
                ...withoutSource,
                {
                  ...source,
                  variantId: variant.id,
                  size: nextSize,
                  color: nextColor,
                  quantity: targetQuantity,
                },
              ];

          return {
            cart: newCart,
            cartReservationError: undefined,
            coupon: recalculateCoupon(state.coupon, newCart),
          };
        }),
      removeFromCart: (slug, size, color) =>
        set((state) => {
          const lineToRemove = state.cart.find(
            (line) =>
              line.product.slug === slug &&
              (!size || line.size === size) &&
              (!color || line.color === color),
          );
          const newCart = state.cart.filter(
            (line) =>
              !(
                line.product.slug === slug &&
                (!size || line.size === size) &&
                (!color || line.color === color)
              ),
          );
          return {
            cart: newCart,
            lastRemovedLine: lineToRemove,
            coupon: recalculateCoupon(state.coupon, newCart),
          };
        }),
      toggleWishlist: (slug, intent) =>
        set((state) => {
          const removing = state.wishlist.includes(slug);
          const wishlistIntents = { ...state.wishlistIntents };
          if (removing) delete wishlistIntents[slug];
          else if (intent) wishlistIntents[slug] = intent;
          return {
            wishlist: removing ? state.wishlist.filter((item) => item !== slug) : [...state.wishlist, slug],
            wishlistIntents,
          };
        }),
      setWishlist: (slugs, intents) =>
        set((state) => {
          const wishlist = Array.from(new Set(slugs.filter(Boolean)));
          const source = intents ?? state.wishlistIntents;
          return { wishlist, wishlistIntents: Object.fromEntries(Object.entries(source).filter(([slug]) => wishlist.includes(slug))) };
        }),
      setWishlistIntent: (slug, intent) =>
        set((state) => state.wishlist.includes(slug) ? { wishlistIntents: { ...state.wishlistIntents, [slug]: intent } } : state),
      setCartOpen: (cartOpen) => set({ cartOpen }),
      setCartSessionKey: (cartSessionKey) => set({ cartSessionKey }),
      startNewCartSession: (cartSessionKey) =>
        set({
          cartSessionKey,
          cartExpiresAt: undefined,
          cartReservationError: undefined,
          cartSyncStatus: "idle",
          cartRecoveryNotice: undefined,
        }),
      setCartReservationError: (cartReservationError) =>
        set({ cartReservationError }),
      setCartSyncStatus: (cartSyncStatus, cartRecoveryNotice) =>
        set({ cartSyncStatus, cartRecoveryNotice }),
      replaceCart: ({ cart, cartSessionKey, cartExpiresAt }) =>
        set((state) => ({
          cart,
          cartSessionKey,
          cartExpiresAt,
          cartOpen: true,
          cartReservationError: undefined,
          cartSyncStatus: "synced",
          cartRecoveryNotice: state.cartReservationError ? "restored" : undefined,
          coupon: recalculateCoupon(state.coupon, cart),
          lastRemovedLine: undefined,
        })),
      clearCart: () => set({ cart: [], cartSessionKey: "", coupon: undefined, couponError: undefined, customerNote: "", cartExpiresAt: undefined, cartReservationError: undefined }),
      applyCouponCode: async (code) => {
        if (!code.trim()) return;
        const subtotal = cartSubtotal(get().cart);
        set({ couponError: undefined });
        try {
          const response = await fetch("/api/coupons/validate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              code: code.toUpperCase(),
              subtotal,
              items: get().cart.map((line) => ({
                productId: line.product.id,
                category: line.product.category,
                collections: line.product.collections ?? [line.product.collection].filter(Boolean),
                lineTotal: (line.product.salePrice ?? line.product.price) * line.quantity,
              })),
            }),
          });
          const result = await response.json();
          if (!response.ok) {
            throw new Error(result.message ?? "Unable to apply coupon");
          }
          set({
            coupon: {
              code: result.coupon.code,
              discount: result.coupon.discount,
              freeShipping: result.coupon.freeShipping,
              type: result.coupon.type,
              value: result.coupon.value,
              minimumAmount: result.coupon.minimumAmount,
            },
            couponError: undefined,
          });
        } catch (error) {
          set({
            coupon: undefined,
            couponError: error instanceof Error ? error.message : "Unable to apply coupon",
          });
        }
      },
      removeCoupon: () => set({ coupon: undefined, couponError: undefined }),
      setCartExpiresAt: (cartExpiresAt) => set({ cartExpiresAt }),
      setCustomerNote: (customerNote) => set({ customerNote }),
      undoRemove: () =>
        set((state) => {
          if (!state.lastRemovedLine) return {};
          const existingIndex = state.cart.findIndex(
            (line) =>
              line.product.slug === state.lastRemovedLine!.product.slug &&
              line.size === state.lastRemovedLine!.size &&
              line.color === state.lastRemovedLine!.color,
          );
          let newCart;
          if (existingIndex > -1) {
            newCart = state.cart.map((line, idx) =>
              idx === existingIndex
                ? { ...line, quantity: line.quantity + state.lastRemovedLine!.quantity }
                : line,
            );
          } else {
            newCart = [...state.cart, state.lastRemovedLine];
          }
          return {
            cart: newCart,
            lastRemovedLine: undefined,
            coupon: recalculateCoupon(state.coupon, newCart),
          };
        }),
    }),
    {
      name: "velora-store",
      version: 3,
      migrate: (persisted) => {
        const state = persisted as PersistedStoreState;
        return {
          cart: state.cart ?? [],
          cartSessionKey: state.cartSessionKey ?? "",
          wishlist: state.wishlist ?? [],
          wishlistIntents: state.wishlistIntents ?? {},
          cartExpiresAt: state.cartExpiresAt ?? undefined,
          coupon: state.coupon ?? undefined,
          customerNote: state.customerNote ?? "",
        };
      },
      partialize: (state) => ({
        cart: state.cart,
        cartSessionKey: state.cartSessionKey,
        wishlist: state.wishlist,
        wishlistIntents: state.wishlistIntents,
        cartExpiresAt: state.cartExpiresAt,
        coupon: state.coupon,
        customerNote: state.customerNote,
      }),
    },
  ),
);

export const cartSubtotal = (cart: CartLine[]) =>
  cart.reduce((total, line) => total + (line.product.salePrice ?? line.product.price) * line.quantity, 0);

export function useStoreHydrated() {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const persistApi = useStore.persist;
    if (!persistApi) {
      queueMicrotask(() => setHydrated(true));
      return;
    }

    let active = true;
    const markHydrated = () => {
      queueMicrotask(() => {
        if (active) setHydrated(true);
      });
    };

    if (persistApi.hasHydrated()) {
      markHydrated();
      return () => {
        active = false;
      };
    }

    const unsubscribe = persistApi.onFinishHydration(markHydrated);
    const rehydration = persistApi.rehydrate();
    if (rehydration instanceof Promise) {
      void rehydration.finally(markHydrated);
    } else {
      queueMicrotask(() => {
        if (persistApi.hasHydrated()) markHydrated();
      });
    }

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return hydrated;
}
