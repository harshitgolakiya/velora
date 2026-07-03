"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";

export function CheckoutConfirmationClient({
  clearCart,
}: {
  clearCart: boolean;
}) {
  useEffect(() => {
    if (!clearCart) return;
    const timer = window.setTimeout(() => {
      useStore.getState().clearCart();
      useStore.getState().setCartExpiresAt(undefined);
      useStore.getState().setCartReservationError(undefined);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [clearCart]);

  return null;
}
