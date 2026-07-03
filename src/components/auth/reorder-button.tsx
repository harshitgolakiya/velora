"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";

export function ReorderButton({
  orderNumber,
  children,
}: {
  orderNumber: string;
  children: ReactNode;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const replaceCart = useStore((state) => state.replaceCart);
  const router = useRouter();

  async function reorder() {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/account/orders/${orderNumber}/reorder`, {
        method: "POST",
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message ?? "Unable to reorder this order.");
      }
      replaceCart({
        cart: result.cart,
        cartSessionKey: result.cartSessionKey,
        cartExpiresAt: result.cartExpiresAt,
      });
      setMessage(result.message ?? "Available items were added to your bag.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to reorder this order.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => void reorder()}
        disabled={loading}
        className="inline-flex h-11 w-full items-center justify-center gap-2 bg-[var(--foreground)] px-4 text-sm font-semibold text-[var(--background)] disabled:opacity-60"
      >
        {loading ? "Checking availability" : children}
      </button>
      {message ? <p className="mt-2 text-xs leading-5 text-[var(--muted)]">{message}</p> : null}
    </div>
  );
}
