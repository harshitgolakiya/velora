import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Check, Download, PackageCheck, RefreshCw, RotateCcw, Truck } from "lucide-react";
import { ReorderButton } from "@/components/auth/reorder-button";
import { getAuthorizedAccountOrder, formatAddressLines, getOrderTimeline } from "@/lib/account-orders";
import { requireCustomerSession } from "@/lib/account-data";
import { getPaymentStatusLabel } from "@/lib/payment-display";
import { formatAed } from "@/lib/utils";
import { requestLocale } from "@/lib/cms";
import { localizedPath } from "@/lib/i18n";
import { ContextualSupport } from "@/components/store/contextual-support";

export const metadata: Metadata = {
  title: "Order Details",
  robots: { index: false, follow: false },
};

function statusClass(complete: boolean) {
  return complete
    ? "border-[var(--accent)] bg-[var(--accent)] text-[#17262D]"
    : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]";
}

export default async function AccountOrderDetailPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const locale = await requestLocale();
  const session = await requireCustomerSession();
  if (!session) redirect(localizedPath("/account", locale));
  const userId = session.user.id;
  const email = session.user.email;
  if (!userId || !email) redirect(localizedPath("/account", locale));

  const { orderNumber } = await params;
  const order = await getAuthorizedAccountOrder({
    orderNumber,
    userId,
    email,
  });

  if (!order) notFound();

  const timeline = getOrderTimeline(order);
  const shippingLines = formatAddressLines(order.shippingAddress);
  const billingLines = formatAddressLines(order.billingAddress);
  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const returnRequested = order.returnRequests.length > 0 || (order.orderTags ?? "")
    .split(",")
    .map((tag) => tag.trim())
    .some((tag) => ["return_requested", "refund_requested", "exchange_requested"].includes(tag));

  return (
    <section className="storefront-container py-10">
      <Link href={localizedPath("/account", locale)} className="inline-flex items-center gap-2 text-sm font-medium text-[var(--muted)] transition hover:text-[var(--foreground)] motion-reduce:transition-none">
        <ArrowLeft className="size-4" />
        Back to account
      </Link>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <div className="storefront-framed p-5 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
              Order {order.orderNumber}
            </p>
            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="text-3xl font-semibold leading-tight sm:text-5xl">Order details</h1>
                <p className="mt-3 text-sm text-[var(--muted)]">
                  {new Intl.DateTimeFormat("en-AE", {
                    dateStyle: "full",
                    timeStyle: "short",
                  }).format(order.createdAt)} / {itemCount} items
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-[var(--border)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em]">
                  {getPaymentStatusLabel(order.payment?.status ?? order.paymentStatus, order.payment?.provider)}
                </span>
                <span className="rounded-full border border-[var(--border)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em]">
                  {order.fulfillmentStatus}
                </span>
              </div>
            </div>
          </div>

          <section className="storefront-framed">
            <div className="flex items-center gap-3 border-b border-[var(--border)] p-5">
              <PackageCheck className="size-5 text-[var(--accent)]" />
              <h2 className="text-xl font-semibold">Items</h2>
            </div>
            <div className="divide-y divide-[var(--border)]">
              {order.items.map((item) => (
                <div key={item.id} className="grid gap-3 p-5 text-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                  <div>
                    <Link href={localizedPath(`/product/${item.product.slug}`, locale)} className="font-semibold underline-offset-4 hover:underline">
                      {item.title}
                    </Link>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {item.color} / {item.size} / Qty {item.quantity}
                      {item.variant?.sku ? ` / ${item.variant.sku}` : ""}
                    </p>
                  </div>
                  <span className="font-semibold">{formatAed(Number(item.unitPrice) * item.quantity)}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="storefront-framed p-5">
            <div className="flex items-center gap-3">
              <Truck className="size-5 text-[var(--accent)]" />
              <h2 className="text-xl font-semibold">Status timeline</h2>
            </div>
            <ol className="mt-6 grid gap-4">
              {timeline.map((step) => (
                <li key={step.label} className="grid grid-cols-[32px_minmax(0,1fr)] gap-3">
                  <span className={`grid size-8 place-items-center rounded-full border text-xs font-semibold ${statusClass(step.complete)}`}>
                    {step.complete ? <Check className="size-4" /> : ""}
                  </span>
                  <span>
                    <span className="block font-semibold">{step.label}</span>
                    <span className="mt-1 block text-xs text-[var(--muted)]">{step.detail}</span>
                  </span>
                </li>
              ))}
            </ol>
          </section>

          {order.customerNote ? (
            <section className="storefront-framed p-5">
              <h2 className="text-xl font-semibold">Order note</h2>
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{order.customerNote}</p>
            </section>
          ) : null}

          {order.refunds.length ? (
            <section className="storefront-framed p-5">
              <h2 className="text-xl font-semibold">Refund history</h2>
              <div className="mt-4 divide-y divide-[var(--border)] storefront-railed">
                {order.refunds.map((refund) => (
                  <div key={refund.id} className="flex items-start justify-between gap-5 py-4 text-sm">
                    <div>
                      <p className="font-semibold">{refund.kind === "FULL" ? "Full refund" : "Partial refund"}</p>
                      <p className="mt-1 text-xs text-[var(--muted)]">{new Intl.DateTimeFormat("en-AE", { dateStyle: "medium", timeStyle: "short" }).format(refund.createdAt)} · {refund.status.toLowerCase()}</p>
                      {refund.note ? <p className="mt-2 text-xs leading-5 text-[var(--muted)]">{refund.note}</p> : null}
                    </div>
                    <span className="font-semibold text-red-600">-{formatAed(Number(refund.amount))}</span>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs leading-5 text-[var(--muted)]">Refund arrival time depends on the original payment provider and issuing bank.</p>
            </section>
          ) : null}

        </div>

        <aside className="space-y-5">
          <section className="storefront-framed p-5">
            <h2 className="text-xl font-semibold">Summary</h2>
            <div className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between text-[var(--muted)]">
                <span>Subtotal</span>
                <span className="text-[var(--foreground)]">{formatAed(Number(order.subtotal))}</span>
              </div>
              {Number(order.discountTotal) > 0 ? (
                <div className="flex justify-between text-emerald-700">
                  <span>Discount</span>
                  <span>-{formatAed(Number(order.discountTotal))}</span>
                </div>
              ) : null}
              <div className="flex justify-between text-[var(--muted)]">
                <span>Shipping</span>
                <span className="text-[var(--foreground)]">
                  {Number(order.shippingTotal) === 0 ? "Free" : formatAed(Number(order.shippingTotal))}
                </span>
              </div>
              <div className="flex justify-between border-t border-[var(--border)] pt-4 text-base font-semibold">
                <span>Total</span>
                <span>{formatAed(Number(order.total))}</span>
              </div>
              {order.refundAmount ? (
                <div className="flex justify-between text-red-600">
                  <span>Refunded</span>
                  <span>{formatAed(Number(order.refundAmount))}</span>
                </div>
              ) : null}
              {order.refundAmount ? (
                <div className="flex justify-between border-t border-[var(--border)] pt-4 font-semibold">
                  <span>Net total</span>
                  <span>{formatAed(Math.max(0, Number(order.total) - Number(order.refundAmount)))}</span>
                </div>
              ) : null}
            </div>
          </section>

          <section className="grid gap-3">
            <a
              href={`/api/account/orders/${order.orderNumber}/invoice`}
              className="storefront-action inline-flex h-11 items-center justify-center gap-2 border border-[var(--border)] text-sm font-semibold transition hover:border-[var(--foreground)] hover:bg-[var(--hover)] motion-reduce:transition-none"
            >
              <Download className="size-4" />
              Download invoice
            </a>
            <ReorderButton orderNumber={order.orderNumber}>
              <RotateCcw className="size-4" />
              Reorder available items
            </ReorderButton>
            <Link
              href={localizedPath(`/account/orders/${order.orderNumber}/return`, locale)}
              className="storefront-action inline-flex h-11 items-center justify-center gap-2 border border-[var(--border)] px-4 text-sm font-semibold transition hover:border-[var(--foreground)] hover:bg-[var(--hover)] motion-reduce:transition-none"
            >
              <RefreshCw className="size-4" />
              {returnRequested ? "View return request" : "Return or exchange"}
            </Link>
          </section>

          <section className="storefront-framed p-5 text-sm">
            <h2 className="font-semibold">Delivery address</h2>
            <p className="mt-3 leading-6 text-[var(--muted)]">
              {shippingLines.length ? shippingLines.map((line) => <span key={line}>{line}<br /></span>) : "No delivery address saved."}
            </p>
          </section>

          <section className="storefront-framed p-5 text-sm">
            <h2 className="font-semibold">Billing address</h2>
            <p className="mt-3 leading-6 text-[var(--muted)]">
              {billingLines.length ? billingLines.map((line) => <span key={line}>{line}<br /></span>) : "Same as delivery."}
            </p>
          </section>

          <section className="storefront-framed p-5 text-sm">
            <h2 className="font-semibold">Shipment</h2>
            <p className="mt-3 leading-6 text-[var(--muted)]">
              Carrier: {order.shipment?.carrier ?? "Pending"}<br />
              Tracking: {order.shipment?.trackingNo ?? "Pending"}<br />
              Status: {order.shipment?.status ?? order.fulfillmentStatus}
            </p>
          </section>
          <ContextualSupport context="order" orderNumber={order.orderNumber} compact />
        </aside>
      </div>
    </section>
  );
}
