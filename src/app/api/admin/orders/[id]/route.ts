import { NextResponse } from "next/server";
import { OrderStatus } from "@prisma/client";
import { recordAdminActivity } from "@/lib/admin-activity";
import { requireAdminApiPermission } from "@/lib/admin-api";
import { updateOrderSchema } from "@/lib/admin-validation";
import { queueAutomationEvent } from "@/lib/automation-events";
import { prisma } from "@/lib/prisma";
import { sendRefundNotificationEmail } from "@/lib/refund-email";
import { sendShipmentNotificationEmail } from "@/lib/shipment-email";

function normalizeTags(value: string | null | undefined) {
  if (!value) return [];
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApiPermission("orders:write");
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const parsed = updateOrderSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid order payload", errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = parsed.data;

  try {
    const order = await prisma.$transaction(async (tx) => {
      const previousOrder = await tx.order.findUnique({
        where: { id },
        select: {
          total: true,
          refundAmount: true,
          email: true,
          locale: true,
          orderNumber: true,
          status: true,
          userId: true,
          shipment: { select: { id: true, status: true, carrier: true, trackingNo: true, shippedAt: true, deliveredAt: true } },
        },
      });
      if (!previousOrder) throw new Error("Record to update not found");
      const orderTotal = Number(previousOrder.total);
      const previousRefund = Number(previousOrder.refundAmount ?? 0);
      const fullRefundRequested = data.status === "REFUNDED" || data.paymentStatus === "refunded";
      const normalizedRefundAmount = data.refundAmount ?? (fullRefundRequested ? orderTotal : null);
      if (normalizedRefundAmount != null && normalizedRefundAmount > orderTotal) {
        throw new Error("Refund amount cannot exceed the order total");
      }
      const shipmentNow = new Date();
      const marksShipped = data.status === "SHIPPED" || data.status === "DELIVERED";
      const marksDelivered = data.status === "DELIVERED";
      const updatedOrder = await tx.order.update({
        where: { id },
        data: {
          status: data.status as OrderStatus,
          paymentStatus: data.paymentStatus,
          fulfillmentStatus: data.fulfillmentStatus,
          internalNote: data.internalNote?.trim() || null,
          shipment:
            data.carrier || data.trackingNo || data.fulfillmentStatus
              ? {
                  upsert: {
                    create: {
                      carrier: data.carrier?.trim() || null,
                      trackingNo: data.trackingNo?.trim() || null,
                      status: data.fulfillmentStatus,
                      shippedAt: marksShipped ? shipmentNow : null,
                      deliveredAt: marksDelivered ? shipmentNow : null,
                    },
                    update: {
                      carrier: data.carrier?.trim() || null,
                      trackingNo: data.trackingNo?.trim() || null,
                      status: data.fulfillmentStatus,
                      shippedAt: marksShipped && !previousOrder.shipment?.shippedAt ? shipmentNow : undefined,
                      deliveredAt: marksDelivered && !previousOrder.shipment?.deliveredAt ? shipmentNow : undefined,
                    },
                  },
                }
              : undefined,
          customerNote: data.customerNote?.trim() || null,
          orderTags: data.tags ? JSON.stringify(normalizeTags(data.tags)) : null,
          refundAmount: normalizedRefundAmount,
        },
        select: { id: true, orderNumber: true, status: true, paymentStatus: true, fulfillmentStatus: true },
      });

      await tx.payment.updateMany({
        where: { orderId: id },
        data: {
            status: data.paymentStatus,
        },
      });

      const shipment = await tx.shipment.findUnique({ where: { orderId: id } });
      const shipmentChanged = Boolean(
        shipment && (
          !previousOrder.shipment
          || shipment.status !== previousOrder.shipment.status
          || shipment.carrier !== previousOrder.shipment.carrier
          || shipment.trackingNo !== previousOrder.shipment.trackingNo
        ),
      );
      const shipmentEvent = shipment && shipmentChanged && (
        shipment.status !== "unfulfilled" || Boolean(shipment.carrier) || Boolean(shipment.trackingNo)
      )
        ? await tx.shipmentEvent.create({
            data: {
              shipmentId: shipment.id,
              status: shipment.status,
              carrier: shipment.carrier,
              trackingNo: shipment.trackingNo,
              message: marksDelivered ? "Order delivered" : marksShipped ? "Order dispatched" : "Shipment updated",
              actor: auth.access.name,
            },
          })
        : null;

      const refundDelta = Math.max(0, Number(normalizedRefundAmount ?? 0) - previousRefund);
      const refundRecord = refundDelta > 0
        ? await tx.refundRecord.create({
            data: {
              orderId: id,
              amount: refundDelta,
              kind: Number(normalizedRefundAmount) >= orderTotal ? "FULL" : "PARTIAL",
              note: data.customerNote?.trim() || null,
              actor: auth.access.name,
            },
          })
        : null;

      const deliveredNow = marksDelivered && previousOrder.status !== "DELIVERED";
      const deliveryAutomation = deliveredNow
        ? await tx.order.findUnique({
            where: { id },
            select: {
              id: true,
              email: true,
              orderNumber: true,
              user: { select: { postPurchaseEmails: true, reviews: { select: { productId: true } } } },
              shippingAddress: { select: { name: true } },
              items: { select: { productId: true, product: { select: { title: true, slug: true } } } },
            },
          })
        : null;

      return {
        ...updatedOrder,
        email: previousOrder.email,
        locale: previousOrder.locale,
        refundAmount: Number(normalizedRefundAmount ?? 0),
        refundRecord,
        shipment,
        shipmentEvent,
        deliveredNow,
        deliveryAutomation,
      };
    });

    await recordAdminActivity({
      action: `Updated order ${order.orderNumber}`,
      entityType: "order",
      entityId: order.id,
      actor: auth.access.name,
      metadata: {
        status: order.status,
        paymentStatus: order.paymentStatus,
        fulfillmentStatus: order.fulfillmentStatus,
        refundAmount: order.refundAmount,
      },
    });

    if (order.refundRecord) {
      await sendRefundNotificationEmail({
        recipient: order.email,
        orderId: order.id,
        orderNumber: order.orderNumber,
        refundId: order.refundRecord.id,
        amount: Number(order.refundRecord.amount),
        totalRefunded: order.refundAmount,
        kind: order.refundRecord.kind,
        locale: order.locale,
      });
    }
    if (order.shipmentEvent) {
      await sendShipmentNotificationEmail({
        recipient: order.email,
        orderId: order.id,
        orderNumber: order.orderNumber,
        eventId: order.shipmentEvent.id,
        status: order.shipmentEvent.status,
        carrier: order.shipmentEvent.carrier,
        trackingNo: order.shipmentEvent.trackingNo,
        locale: order.locale,
      });
    }
    const deliveryAutomation = order.deliveryAutomation;
    if (order.deliveredNow && deliveryAutomation && deliveryAutomation.user?.postPurchaseEmails !== false) {
      const reviewedIds = new Set(deliveryAutomation.user?.reviews.map((review) => review.productId) ?? []);
      const unreviewed = deliveryAutomation.items.find((item) => !reviewedIds.has(item.productId));
      const commonMetadata = {
        orderNumber: deliveryAutomation.orderNumber,
        customerName: deliveryAutomation.shippingAddress?.name,
      };
      await queueAutomationEvent({
        type: "POST_PURCHASE",
        sourceKey: `post-purchase:${deliveryAutomation.id}`,
        recipient: deliveryAutomation.email,
        orderId: deliveryAutomation.id,
        metadata: commonMetadata,
      });
      if (unreviewed) {
        await queueAutomationEvent({
          type: "REVIEW_REQUEST",
          sourceKey: `review-request:${deliveryAutomation.id}`,
          recipient: deliveryAutomation.email,
          orderId: deliveryAutomation.id,
          metadata: {
            ...commonMetadata,
            productName: unreviewed.product.title,
            productSlug: unreviewed.product.slug,
          },
        });
      }
    }

    return NextResponse.json({ ok: true, id: order.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update order";
    const status = message.includes("Record to update not found") ? 404 : message.includes("cannot exceed") ? 400 : 500;
    return NextResponse.json({ message }, { status });
  }
}
