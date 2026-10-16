"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { formatCartReservationError, isCartReservationExpired } from "@/lib/cart-ui";
import { cartCopy, localeFromPathname } from "@/lib/i18n";
import { useStore } from "@/lib/store";

export function useCartCopy() {
  const pathname = usePathname();
  return cartCopy[localeFromPathname(pathname)];
}

export function ReservationTimer({
  onExpiredChange,
}: {
  onExpiredChange?: (expired: boolean) => void;
}) {
  const copy = useCartCopy();
  const expiresAt = useStore((state) => state.cartExpiresAt);
  const [timeLeft, setTimeLeft] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (!expiresAt) {
      const timer = window.setTimeout(() => {
        setTimeLeft(null);
        setExpired(false);
        onExpiredChange?.(false);
      }, 0);
      return () => window.clearTimeout(timer);
    }

    const updateTimer = () => {
      const isExpired = isCartReservationExpired(expiresAt);
      if (isExpired) {
        setTimeLeft(null);
        setExpired(true);
        onExpiredChange?.(true);
      } else {
        const diff = new Date(expiresAt).getTime() - Date.now();
        const mins = Math.floor(diff / 60_000);
        const secs = Math.floor((diff % 60_000) / 1000);
        setTimeLeft(`${mins}:${secs.toString().padStart(2, "0")}`);
        setExpired(false);
        onExpiredChange?.(false);
      }
    };

    const initialTimer = window.setTimeout(updateTimer, 0);
    const interval = window.setInterval(updateTimer, 1000);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(interval);
    };
  }, [expiresAt, onExpiredChange]);

  if (!expiresAt) return null;

  return (
    <div
      role={expired ? "alert" : "status"}
      className={`border-b px-5 py-2.5 text-center text-xs font-semibold uppercase tracking-wider transition-colors motion-reduce:transition-none ${
        expired
          ? "border-red-500/20 bg-red-500/10 text-[var(--sale)]"
          : "border-[var(--border)] bg-[var(--hover)] text-[var(--accent-text)]"
      }`}
    >
      {expired
        ? copy.reservationExpired
        : `${copy.inventoryReserved} • ${timeLeft}`}
    </div>
  );
}

export function CartRecoveryBanner() {
  const copy = useCartCopy();
  const reservationError = useStore((state) => state.cartReservationError);
  const cartSyncStatus = useStore((state) => state.cartSyncStatus);
  const cartRecoveryNotice = useStore((state) => state.cartRecoveryNotice);

  if (!reservationError && cartSyncStatus !== "syncing" && cartRecoveryNotice !== "restored") return null;

  if (reservationError) {
    const errorLabel = formatCartReservationError(reservationError, copy);
    return (
      <div
        role="alert"
        className={`border-b px-5 py-3 text-xs ${
          errorLabel.tone === "warning"
            ? "border-[var(--sale)]/20 bg-amber-500/10 text-[var(--sale)]"
            : "border-red-500/20 bg-red-500/10 text-[var(--sale)]"
        }`}
      >
        <p className="font-semibold">{errorLabel.title}</p>
        <p className="mt-1">{errorLabel.detail}</p>
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event("velora:retry-cart"))}
          className="mt-2 font-semibold underline"
        >
          {copy.retryInventoryCheck}
        </button>
      </div>
    );
  }

  if (cartSyncStatus === "syncing") {
    return (
      <div role="status" className="border-b border-[var(--border)] bg-[var(--hover)] px-5 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
        {copy.checkingInventory}
      </div>
    );
  }

  return (
    <div role="status" className="border-b border-[var(--accent-soft)] bg-[var(--accent-soft)] px-5 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-[var(--accent-text)]">
      {copy.cartRecovered}
    </div>
  );
}
