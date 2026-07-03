import { NextResponse } from "next/server";
import Stripe from "stripe";
import { completeCartOrder } from "@/lib/cart-reservations";
import { attributeAutomationConversions, deliverEmail } from "@/lib/email-delivery";
import { prisma } from "@/lib/prisma";
import { recordPaymentProviderEvent } from "@/lib/payment-provider-events";
import { mapStripeRefundStatus } from "@/lib/refund-provider";
import { sendRefundNotificationEmail } from "@/lib/refund-email";
import { attributeProductAlertConversions } from "@/lib/product-alert-queue";
import { orderConfirmationEmail } from "../../../../../emails/order-confirmation";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const body = await request.text();

  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET || !signature) {
    return NextResponse.json({ received: false, mode: "stub" }, { status: 200 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  await recordPaymentProviderEvent({
    provider: "stripe",
    providerEventId: event.id,
    eventType: event.type,
    paymentRef: "id" in event.data.object ? event.data.object.id : undefined,
    payload: event.data.object,
    status: "RECEIVED",
    severity: event.type.includes("failed") || event.type.includes("dispute") ? "WARN" : "INFO",
    occurredAt: new Date(event.created * 1000),
  });

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const orderId = session.metadata?.orderId;
    if (orderId) {
      await completeCartOrder(orderId, session.id);
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: { id: true, orderNumber: true, email: true, locale: true, total: true, items: { select: { productId: true } } },
      });
      if (order) {
        await recordPaymentProviderEvent({
          provider: "stripe",
          providerEventId: event.id,
          eventType: event.type,
          orderId: order.id,
          orderNumber: order.orderNumber,
          paymentRef: session.id,
          status: "PROCESSED",
          processedAt: new Date(),
        });
        await attributeProductAlertConversions({
          email: order.email,
          productIds: order.items.map((item) => item.productId),
        });
        await attributeAutomationConversions({
          email: order.email,
          orderId: order.id,
          orderTotal: Number(order.total),
        });
        const message = orderConfirmationEmail(order.orderNumber, order.locale);
        const existing = await prisma.emailDelivery.findUnique({
          where: { sourceKey: `order-confirmation:${order.id}` },
          select: { id: true },
        });
        if (!existing) {
          await deliverEmail({
            recipient: order.email,
            subject: message.subject,
            html: message.html,
            orderId: order.id,
            sourceKey: `order-confirmation:${order.id}`,
            metadata: { type: "ORDER_CONFIRMATION", locale: order.locale },
          });
        }
      }
    }
  }

  if (["refund.created", "refund.updated", "refund.failed"].includes(event.type)) {
    const stripeRefund = event.data.object as Stripe.Refund;
    const record = await prisma.refundRecord.findUnique({
      where: { providerRef: stripeRefund.id },
      include: { order: true, returnRequest: true },
    });
    if (record) {
      await recordPaymentProviderEvent({
        provider: "stripe",
        providerEventId: event.id,
        eventType: event.type,
        orderId: record.orderId,
        orderNumber: record.order.orderNumber,
        paymentRef: stripeRefund.id,
        status: stripeRefund.status === "failed" ? "ACTION_REQUIRED" : "PROCESSED",
        severity: stripeRefund.status === "failed" ? "ERROR" : "INFO",
        message: stripeRefund.failure_reason ?? undefined,
        processedAt: new Date(),
      });
      const nextStatus = mapStripeRefundStatus(stripeRefund.status);
      if (record.status !== nextStatus) {
        const result = await prisma.$transaction(async (tx) => {
          const updatedRefund = await tx.refundRecord.update({
            where: { id: record.id },
            data: { status: nextStatus, note: stripeRefund.failure_reason ?? `Stripe refund status: ${stripeRefund.status}` },
          });
          const completed = await tx.refundRecord.aggregate({ where: { orderId: record.orderId, status: "COMPLETED" }, _sum: { amount: true } });
          const totalRefunded = Number(completed._sum.amount ?? 0);
          if (nextStatus === "COMPLETED") {
            await tx.order.update({
              where: { id: record.orderId },
              data: { refundAmount: totalRefunded, paymentStatus: totalRefunded >= Number(record.order.total) ? "refunded" : "partially_refunded" },
            });
          }
          if (record.returnRequestId) {
            await tx.returnRequest.update({
              where: { id: record.returnRequestId },
              data: nextStatus === "COMPLETED" ? {
                status: "COMPLETED",
                integrationStatus: "COMPLETED",
                completedAt: new Date(),
                events: { create: { status: "COMPLETED", message: "Stripe confirmed the refund", actor: "Stripe webhook" } },
              } : nextStatus === "FAILED" ? {
                status: "INSPECTED",
                integrationStatus: "FAILED",
                events: { create: { status: "INSPECTED", message: "Stripe refund failed; admin action required", actor: "Stripe webhook" } },
              } : { integrationStatus: nextStatus },
            });
          }
          return { updatedRefund, totalRefunded };
        });
        if (nextStatus === "COMPLETED") {
          await sendRefundNotificationEmail({
            recipient: record.order.email,
            orderId: record.orderId,
            orderNumber: record.order.orderNumber,
            refundId: record.id,
            amount: Number(record.amount),
            totalRefunded: result.totalRefunded,
            kind: record.kind,
            locale: record.order.locale,
          });
        }
      }
    }
  }

  if (event.type.startsWith("charge.dispute.") || event.type.startsWith("payment_intent.payment_failed")) {
    const providerObject = event.data.object as { id?: string; payment_intent?: string | null; status?: string; reason?: string };
    const paymentRef = typeof providerObject.payment_intent === "string"
      ? providerObject.payment_intent
      : providerObject.id;
    await recordPaymentProviderEvent({
      provider: "stripe",
      providerEventId: event.id,
      eventType: event.type,
      paymentRef,
      status: "ACTION_REQUIRED",
      severity: "WARN",
      message: providerObject.reason ?? providerObject.status ?? "Stripe payment event requires review.",
      processedAt: new Date(),
    });
  }

  await recordPaymentProviderEvent({
    provider: "stripe",
    providerEventId: event.id,
    eventType: event.type,
    status: event.type.includes("dispute") || event.type.includes("failed") ? "ACTION_REQUIRED" : "PROCESSED",
    processedAt: new Date(),
  });

  return NextResponse.json({ received: true });
}
