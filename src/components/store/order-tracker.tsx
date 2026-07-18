"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowRight, CheckCircle2, ChevronDown, Package, Search, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { localeFromPathname, orderTrackerCopy } from "@/lib/i18n";
import { getPaymentStatusLabel } from "@/lib/payment-display";

function useOrderTrackerCopy() {
  const pathname = usePathname();
  return orderTrackerCopy[localeFromPathname(pathname)];
}

export type TrackedOrder = {
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentProvider?: string;
  fulfillmentStatus: string;
  carrier?: string;
  trackingNo?: string;
  shipmentStatus?: string;
  shippedAt?: string;
  deliveredAt?: string;
  shipmentEvents: Array<{
    id: string;
    status: string;
    carrier?: string;
    trackingNo?: string;
    message?: string;
    createdAt: string;
  }>;
  itemCount: number;
  updatedAt: string;
};

function statusLabel(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const trackerInputClass = "h-12 border border-[var(--border)] bg-[var(--background)] px-4 outline-none transition focus:border-[var(--accent)] motion-reduce:transition-none";

function LookupForm({
  customerEmail,
  loading,
  error,
  onSubmit,
}: {
  customerEmail?: string;
  loading: boolean;
  error: string | null;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const copy = useOrderTrackerCopy();
  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <label className="grid gap-2 text-sm font-medium">
        {copy.orderNumber}
        <input name="orderNumber" required className={`${trackerInputClass} uppercase`} placeholder="VL-2026-123456" />
      </label>
      <label className="grid gap-2 text-sm font-medium">
        {copy.emailAddress}
        <input name="email" required type="email" defaultValue={customerEmail} suppressHydrationWarning className={trackerInputClass} placeholder="you@example.com" />
      </label>
      {error ? <p role="alert" className="text-sm text-red-500">{error}</p> : null}
      <Button disabled={loading}>
        <Search className="size-4" />
        {loading ? copy.findingOrder : copy.trackOrder}
      </Button>
    </form>
  );
}

export function OrderTracker({
  initialOrders = [],
  customerEmail,
}: {
  initialOrders?: TrackedOrder[];
  customerEmail?: string;
}) {
  const copy = useOrderTrackerCopy();
  const [order, setOrder] = useState<TrackedOrder | null>(initialOrders[0] ?? null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/orders/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber: data.get("orderNumber"), email: data.get("email") }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? copy.unableToTrackOrder);
      setOrder(result.order);
    } catch (trackError) {
      setError(trackError instanceof Error ? trackError.message : copy.unableToTrackOrder);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(300px,400px)_minmax(0,1fr)]">
      <div className="grid gap-4">
        {initialOrders.length ? (
          <section className="border border-[var(--border)] bg-[var(--surface)]">
            <div className="border-b border-[var(--border)] px-5 py-4">
              <h2 className="font-semibold">{copy.ordersInProgress}</h2>
              <p className="mt-1 text-xs text-[var(--muted)]">{copy.selectOrderHint}</p>
            </div>
            <div className="divide-y divide-[var(--border)]">
              {initialOrders.map((candidate) => {
                const active = order?.orderNumber === candidate.orderNumber;
                return (
                  <button
                    key={candidate.orderNumber}
                    type="button"
                    onClick={() => {
                      setOrder(candidate);
                      setError(null);
                    }}
                    className={`flex w-full items-center gap-4 px-5 py-4 text-start transition motion-reduce:transition-none ${active ? "bg-[var(--card)]" : "hover:bg-[var(--hover)]"}`}
                    aria-pressed={active}
                  >
                    <span className={`grid size-10 shrink-0 place-items-center ${active ? "bg-[var(--accent)] text-[#111315]" : "bg-[var(--card)] text-[var(--muted)]"}`}>
                      <Package className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{candidate.orderNumber}</span>
                      <span className="mt-1 block text-xs text-[var(--muted)]">
                        {candidate.itemCount} {candidate.itemCount === 1 ? copy.item : copy.items} / {statusLabel(candidate.shipmentStatus ?? candidate.fulfillmentStatus)}
                      </span>
                    </span>
                    <ArrowRight className={`size-4 shrink-0 transition motion-reduce:transition-none ${active ? "text-[var(--accent)]" : "text-[var(--muted)]"}`} />
                  </button>
                );
              })}
            </div>
          </section>
        ) : null}

        {initialOrders.length ? (
          <details className="group border border-[var(--border)] bg-[var(--surface)]">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-sm font-semibold">
              {copy.trackAnotherOrder}
              <ChevronDown className="size-4 transition group-open:rotate-180 motion-reduce:transition-none" />
            </summary>
            <div className="border-t border-[var(--border)] p-5">
              <LookupForm customerEmail={customerEmail} loading={loading} error={error} onSubmit={submit} />
            </div>
          </details>
        ) : (
          <section className="border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
            <h2 className="mb-5 font-semibold">{copy.findAnOrder}</h2>
            <LookupForm customerEmail={customerEmail} loading={loading} error={error} onSubmit={submit} />
          </section>
        )}
      </div>

      {order ? (
        <section className="border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--border)] pb-5">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">{copy.order}</p>
              <h2 className="mt-1 text-2xl font-semibold">{order.orderNumber}</h2>
              <p className="mt-2 text-xs text-[var(--muted)]">{copy.updated} {new Date(order.updatedAt).toLocaleString("en-AE")}</p>
            </div>
            <span className="bg-[var(--accent)] px-3 py-2 text-xs font-semibold uppercase text-[#111315]">{statusLabel(order.status)}</span>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              [CheckCircle2, copy.payment, getPaymentStatusLabel(order.paymentStatus, order.paymentProvider)],
              [Package, copy.fulfillment, statusLabel(order.fulfillmentStatus)],
              [Truck, copy.shipment, statusLabel(order.shipmentStatus ?? copy.notDispatched)],
            ].map(([Icon, label, value]) => (
              <div key={label as string} className="border border-[var(--border)] bg-[var(--card)] p-4">
                <Icon className="size-5 text-[var(--accent)]" />
                <p className="mt-3 text-xs uppercase tracking-[0.12em] text-[var(--muted)]">{label as string}</p>
                <p className="mt-1 font-semibold">{value as string}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-2 text-sm">
            <p>{order.itemCount} {order.itemCount === 1 ? copy.item : copy.items}</p>
            {order.carrier ? <p>{copy.carrier}: <strong>{order.carrier}</strong></p> : null}
            {order.trackingNo ? <p>{copy.tracking}: <strong className="font-mono">{order.trackingNo}</strong></p> : null}
          </div>

          {order.shipmentEvents.length ? (
            <ol className="mt-6 border-t border-[var(--border)] pt-5">
              {order.shipmentEvents.map((event, index) => (
                <li key={event.id} className="grid grid-cols-[24px_minmax(0,1fr)] gap-3 pb-5 last:pb-0">
                  <span className="mt-1 grid size-5 place-items-center bg-[var(--accent)] text-[10px] font-semibold text-[#111315]">{index + 1}</span>
                  <span>
                    <span className="block text-sm font-semibold">{event.message ?? statusLabel(event.status)}</span>
                    <span className="mt-1 block text-xs text-[var(--muted)]">{[event.carrier, event.trackingNo, new Date(event.createdAt).toLocaleString("en-AE")].filter(Boolean).join(" / ")}</span>
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <div className="mt-6 border-t border-[var(--border)] pt-5 text-sm text-[var(--muted)]">
              {copy.trackingEventsPending}
            </div>
          )}

          {customerEmail ? (
            <Link href={`/account/orders/${order.orderNumber}`} className="mt-6 inline-flex h-11 items-center gap-2 border border-[var(--border)] px-4 text-sm font-semibold transition hover:border-[var(--foreground)] motion-reduce:transition-none">
              {copy.viewFullOrderDetails} <ArrowRight className="size-4" />
            </Link>
          ) : null}
        </section>
      ) : (
        <div className="grid min-h-72 place-items-center border border-dashed border-[var(--border)] px-6 text-center text-[var(--muted)]">
          <div><Package className="mx-auto size-7" /><p className="mt-3">{copy.trackingDetailsPlaceholder}</p></div>
        </div>
      )}
    </div>
  );
}
