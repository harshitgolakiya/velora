import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { getPaymentStatusLabel, isPaymentComplete } from "./payment-display";

const accountOrderInclude = {
  items: {
    include: {
      product: {
        select: {
          id: true,
          slug: true,
          title: true,
          status: true,
          variants: {
            select: {
              id: true,
              sku: true,
              stock: true,
              reservedStock: true,
              allowBackorder: true,
              color: { select: { id: true, name: true, hex: true } },
              size: { select: { id: true, name: true } },
            },
          },
        },
      },
      variant: {
        include: {
          color: true,
          size: true,
        },
      },
    },
  },
  payment: true,
  shipment: { include: { events: { orderBy: { createdAt: "asc" } } } },
  shippingAddress: true,
  billingAddress: true,
  coupon: true,
  refunds: { orderBy: { createdAt: "asc" } },
  returnRequests: {
    orderBy: { createdAt: "desc" },
    take: 1,
    include: {
      replacementOrder: {
        select: {
          orderNumber: true,
          status: true,
          fulfillmentStatus: true,
          shipment: { select: { status: true, trackingNo: true } },
        },
      },
      returnShipment: true,
      inspection: true,
      refund: true,
      events: { orderBy: { createdAt: "asc" } },
      evidence: { orderBy: { createdAt: "asc" } },
      items: {
        include: {
          orderItem: true,
          requestedVariant: { include: { color: true, size: true } },
        },
      },
    },
  },
} satisfies Prisma.OrderInclude;

export type AccountOrderDetail = Prisma.OrderGetPayload<{
  include: typeof accountOrderInclude;
}>;

export async function getAuthorizedAccountOrder({
  orderNumber,
  userId,
  email,
}: {
  orderNumber: string;
  userId: string;
  email: string;
}) {
  return prisma.order.findFirst({
    where: {
      orderNumber,
      OR: [{ userId }, { email }],
    },
    include: accountOrderInclude,
  });
}

export function getOrderTimeline(order: AccountOrderDetail) {
  const paymentStatus = order.payment?.status ?? order.paymentStatus;
  const paymentProvider = order.payment?.provider;
  const cod = paymentProvider === "cash_on_delivery" || paymentStatus.toLowerCase() === "cod_pending";
  const shipmentSteps = order.shipment?.events.length
    ? order.shipment.events.map((event) => ({
        label: event.message ?? event.status.replace(/_/g, " "),
        detail: [event.carrier, event.trackingNo, event.createdAt.toISOString()].filter(Boolean).join(" · "),
        complete: true,
      }))
    : [
        {
          label: order.shipment?.shippedAt ? "Shipped" : "Preparing shipment",
          detail: order.shipment?.carrier ?? order.fulfillmentStatus,
          complete: Boolean(order.shipment?.shippedAt),
        },
        {
          label: order.shipment?.deliveredAt ? "Delivered" : "Delivery pending",
          detail: order.shipment?.trackingNo ?? "Tracking will appear here",
          complete: Boolean(order.shipment?.deliveredAt),
        },
      ];
  return [
    {
      label: "Order placed",
      detail: order.createdAt.toISOString(),
      complete: true,
    },
    {
      label: getPaymentStatusLabel(paymentStatus, paymentProvider),
      detail: cod ? "To be collected on delivery" : order.payment?.provider ?? "Checkout",
      complete: isPaymentComplete(paymentStatus) || cod,
    },
    ...shipmentSteps,
    ...order.refunds.map((refund) => ({
      label: refund.kind === "FULL" ? "Refunded" : "Partial refund",
      detail: `AED ${Number(refund.amount).toFixed(2)} · ${refund.createdAt.toISOString()}`,
      complete: refund.status === "COMPLETED",
    })),
  ];
}

export function formatAddressLines(address: AccountOrderDetail["shippingAddress"]) {
  if (!address) return [];
  return [
    address.name,
    address.line1,
    address.line2,
    `${address.city}, ${address.country}`,
    address.postalCode,
    address.phone,
  ].filter(Boolean) as string[];
}
