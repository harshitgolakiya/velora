import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { ReturnRequestForm } from "@/components/auth/return-request-form";
import { requireCustomerSession } from "@/lib/account-data";
import { getAuthorizedAccountOrder } from "@/lib/account-orders";
import { getReturnSettings } from "@/lib/store-settings";
import { requestLocale } from "@/lib/cms";
import { localizedPath } from "@/lib/i18n";
import { ContextualSupport } from "@/components/store/contextual-support";

export const metadata: Metadata = {
  title: "Return or Exchange",
  robots: { index: false, follow: false },
};

export default async function ReturnOrderPage({
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
  const order = await getAuthorizedAccountOrder({ orderNumber, userId, email });
  if (!order) notFound();

  const existingRequest = order.returnRequests[0];
  const returnSettings = await getReturnSettings();
  const deliveredAt = order.shipment?.deliveredAt;
  const returnDeadline = deliveredAt ? new Date(deliveredAt.getTime() + returnSettings.returnWindowDays * 24 * 60 * 60 * 1000) : null;
  const canStartRequest = returnSettings.returnsEnabled
    && !["CANCELLED", "REFUNDED"].includes(order.status)
    && (!returnSettings.requireDeliveredOrder || Boolean(deliveredAt));
  const availableResolutions = [
    "return",
    ...(returnSettings.exchangesEnabled ? ["exchange"] : []),
    ...(returnSettings.refundsEnabled ? ["refund"] : []),
  ] as Array<"return" | "exchange" | "refund">;
  const legacyRequest = !existingRequest && (order.orderTags ?? "")
    .split(",")
    .map((tag) => tag.trim())
    .some((tag) => ["return_requested", "refund_requested", "exchange_requested"].includes(tag));

  return (
    <section className="storefront-container-narrow py-10">
      <Link
        href={localizedPath(`/account/orders/${order.orderNumber}`, locale)}
        className="inline-flex items-center gap-2 text-sm font-medium text-[var(--muted)] transition hover:text-[var(--foreground)]"
      >
        <ArrowLeft className="size-4" />
        Back to order {order.orderNumber}
      </Link>

      <div className="mb-8 mt-7 border-b border-[var(--border)] pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">Order {order.orderNumber}</p>
        <h1 className="mt-3 text-3xl font-semibold sm:text-5xl">Return or exchange</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">
          Select the items and outcome you need. Replacement availability is checked against the same product and color.
        </p>
      </div>

      {!existingRequest ? (
        <section className="mb-6 storefront-framed p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-[var(--accent)]" />
            <div>
              <h2 className="font-semibold">Before you start</h2>
              <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                {returnDeadline
                  ? returnDeadline >= new Date()
                    ? `This order is within the standard return window through ${new Intl.DateTimeFormat("en-AE", { dateStyle: "long" }).format(returnDeadline)}.`
                    : `The standard ${returnSettings.returnWindowDays}-day return window has ended. Defect claims may still be reviewed according to policy.`
                  : returnSettings.requireDeliveredOrder ? "Return eligibility begins after delivery is completed." : "This order can be submitted for review before delivery."}
              </p>
              <ul className="mt-3 grid gap-2 text-xs leading-5 text-[var(--muted)] sm:grid-cols-3">
                <li>{returnSettings.policySummary}</li>
                <li>Refunds are reviewed against the original payment and order status.</li>
                <li>Exchange sizes are confirmed before pickup is arranged.</li>
              </ul>
            </div>
          </div>
        </section>
      ) : null}

      {existingRequest || legacyRequest || canStartRequest ? <ReturnRequestForm
        orderNumber={order.orderNumber}
        requested={Boolean(existingRequest) || legacyRequest}
        availableResolutions={availableResolutions}
        existingRequest={existingRequest ? {
          resolution: existingRequest.resolution,
          reason: existingRequest.reason,
          notes: existingRequest.notes,
          adminNote: existingRequest.adminNote,
          status: existingRequest.status,
          createdAt: existingRequest.createdAt.toISOString(),
          replacementOrder: existingRequest.replacementOrder ? {
            orderNumber: existingRequest.replacementOrder.orderNumber,
            status: existingRequest.replacementOrder.status,
            fulfillmentStatus: existingRequest.replacementOrder.fulfillmentStatus,
            shipmentStatus: existingRequest.replacementOrder.shipment?.status ?? null,
            trackingNo: existingRequest.replacementOrder.shipment?.trackingNo ?? null,
          } : null,
          returnShipment: existingRequest.returnShipment ? {
            status: existingRequest.returnShipment.status,
            carrier: existingRequest.returnShipment.carrier,
            trackingNo: existingRequest.returnShipment.trackingNo,
            pickupStart: existingRequest.returnShipment.pickupStart?.toISOString() ?? null,
            pickupEnd: existingRequest.returnShipment.pickupEnd?.toISOString() ?? null,
            labelId: existingRequest.returnShipment.labelId,
          } : null,
          inspection: existingRequest.inspection ? {
            condition: existingRequest.inspection.condition,
            disposition: existingRequest.inspection.disposition,
            notes: existingRequest.inspection.notes,
            inspectedAt: existingRequest.inspection.inspectedAt.toISOString(),
          } : null,
          refund: existingRequest.refund ? {
            amount: Number(existingRequest.refund.amount),
            status: existingRequest.refund.status,
            provider: existingRequest.refund.provider,
            providerRef: existingRequest.refund.providerRef,
            note: existingRequest.refund.note,
            updatedAt: existingRequest.refund.updatedAt.toISOString(),
          } : null,
          events: existingRequest.events.map((event) => ({
            id: event.id,
            status: event.status,
            message: event.message,
            createdAt: event.createdAt.toISOString(),
          })),
          evidence: existingRequest.evidence.map((item) => ({
            id: item.id,
            originalName: item.originalName,
            mimeType: item.mimeType,
            sizeBytes: item.sizeBytes,
            createdAt: item.createdAt.toISOString(),
            url: `/api/account/orders/${order.orderNumber}/return-request/evidence/${item.id}`,
          })),
          items: existingRequest.items.map((item) => ({
            title: item.orderItem.title,
            color: item.orderItem.color,
            originalSize: item.orderItem.size,
            requestedSize: item.requestedSize ?? item.requestedVariant?.size.name ?? null,
            quantity: item.quantity,
          })),
        } : undefined}
        items={order.items.map((item) => ({
          id: item.id,
          title: item.title,
          color: item.color,
          size: item.size,
          quantity: item.quantity,
          variantId: item.variantId,
          exchangeSizes: item.product.variants
            .filter((variant) => variant.color.name.toLowerCase() === item.color.toLowerCase())
            .map((variant) => ({
              variantId: variant.id,
              size: variant.size.name,
              sku: variant.sku,
              available: variant.allowBackorder || variant.stock - variant.reservedStock > 0,
              isCurrent: variant.id === item.variantId || variant.size.name === item.size,
            })),
        }))}
      /> : (
        <div className="storefront-framed p-6 text-sm leading-6 text-[var(--muted)]">
          A new return request cannot be started for this order yet. Review the policy guidance above or contact support for an exceptional issue.
        </div>
      )}
      <div className="mt-6"><ContextualSupport context="return" orderNumber={order.orderNumber} /></div>
    </section>
  );
}
