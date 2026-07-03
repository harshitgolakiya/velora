"use client";

import { useEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";

export function CartReservationSync() {
  const cart = useStore((state) => state.cart);
  const sessionKey = useStore((state) => state.cartSessionKey);
  const setSessionKey = useStore((state) => state.setCartSessionKey);
  const setReservationError = useStore(
    (state) => state.setCartReservationError,
  );
  const setCartSyncStatus = useStore((state) => state.setCartSyncStatus);
  const initialized = useRef(false);
  const [retryCount, setRetryCount] = useState(0);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const persistApi = useStore.persist;
    if (!persistApi || persistApi.hasHydrated()) {
      queueMicrotask(() => setHydrated(true));
      return;
    }
    return persistApi.onFinishHydration(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!sessionKey) {
      setSessionKey(crypto.randomUUID());
      return;
    }
    initialized.current = true;
  }, [hydrated, sessionKey, setSessionKey]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === "velora-store") {
        void useStore.persist.rehydrate();
      }
    };
    const handleRetry = () => setRetryCount((count) => count + 1);
    window.addEventListener("storage", handleStorage);
    window.addEventListener("online", handleRetry);
    window.addEventListener("velora:retry-cart", handleRetry);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("online", handleRetry);
      window.removeEventListener("velora:retry-cart", handleRetry);
    };
  }, []);

  useEffect(() => {
    if (!initialized.current || !sessionKey) return;
    const timer = window.setTimeout(async () => {
      const syncItems = cart.filter((line) => line.variantId);
      if (syncItems.length === 0) {
        useStore.getState().setCartExpiresAt(undefined);
        setReservationError(undefined);
        setCartSyncStatus("idle");
        return;
      }
      try {
        setCartSyncStatus("syncing");
        const response = await fetch("/api/cart", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionKey,
            items: syncItems.map((line) => ({
              variantId: line.variantId,
              quantity: line.quantity,
            })),
          }),
        });
        const result = await response.json();
        if (!response.ok || result.ok === false) {
          throw new Error(result.error ?? "Unable to reserve cart inventory");
        }
        const hadError = Boolean(useStore.getState().cartReservationError);
        setReservationError(undefined);
        setCartSyncStatus("synced", hadError ? "restored" : undefined);
        if (result.cart?.expiresAt) {
          useStore.getState().setCartExpiresAt(result.cart.expiresAt);
        }
      } catch (error) {
        setCartSyncStatus("error");
        setReservationError(
          typeof navigator !== "undefined" && navigator.onLine === false
            ? "NETWORK_UNAVAILABLE"
            : error instanceof Error ? error.message : "Unable to reserve cart inventory",
        );
      }
    }, 350);

    return () => window.clearTimeout(timer);
  }, [cart, retryCount, sessionKey, setCartSyncStatus, setReservationError]);

  return null;
}
