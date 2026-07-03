import "server-only";

import { ProductAlertType } from "@prisma/client";
import { deliverEmail } from "./email-delivery";
import { prisma } from "./prisma";

const ALERT_COOLDOWN_HOURS = 24;
const RETRY_BASE_MINUTES = 15;

export function becameAvailable(previousAvailable: number, nextAvailable: number) {
  return previousAvailable <= 0 && nextAvailable > 0;
}

export function reachedPriceTarget(previousPrice: number, nextPrice: number, targetPrice: number) {
  return nextPrice < previousPrice && nextPrice <= targetPrice;
}

function isCoolingDown(lastNotifiedAt: Date | null, now: Date) {
  return Boolean(lastNotifiedAt && lastNotifiedAt.getTime() > now.getTime() - ALERT_COOLDOWN_HOURS * 60 * 60_000);
}

async function createDelivery(input: {
  subscriptionId: string;
  eventKey: string;
  triggerValue?: number;
  lastNotifiedAt: Date | null;
}) {
  const now = new Date();
  const suppressed = isCoolingDown(input.lastNotifiedAt, now);
  return prisma.productAlertDelivery.upsert({
    where: { eventKey: input.eventKey },
    create: {
      subscriptionId: input.subscriptionId,
      eventKey: input.eventKey,
      triggerValue: input.triggerValue,
      status: suppressed ? "SUPPRESSED" : "QUEUED",
      suppressionReason: suppressed ? "COOLDOWN" : null,
      nextAttemptAt: now,
    },
    update: {},
  });
}

export async function enqueueBackInStockAlerts(input: {
  variantId: string;
  previousAvailable: number;
  nextAvailable: number;
  transitionKey: string;
}) {
  if (!becameAvailable(input.previousAvailable, input.nextAvailable)) return { queued: 0, suppressed: 0 };
  const subscriptions = await prisma.productAlertSubscription.findMany({
    where: { type: ProductAlertType.BACK_IN_STOCK, status: "ACTIVE", variantId: input.variantId },
    select: { id: true, lastNotifiedAt: true },
  });
  const deliveries = await Promise.all(subscriptions.map((subscription) => createDelivery({
    subscriptionId: subscription.id,
    eventKey: `stock:${subscription.id}:${input.transitionKey}`,
    triggerValue: input.nextAvailable,
    lastNotifiedAt: subscription.lastNotifiedAt,
  })));
  return {
    queued: deliveries.filter((delivery) => delivery.status === "QUEUED").length,
    suppressed: deliveries.filter((delivery) => delivery.status === "SUPPRESSED").length,
  };
}

export async function enqueueBackInStockAlertsForInventoryLog(logId: string) {
  const log = await prisma.inventoryLog.findUnique({
    where: { id: logId },
    include: {
      variant: { select: { reservedStock: true } },
    },
  });
  if (!log) return { queued: 0, suppressed: 0 };
  return enqueueBackInStockAlerts({
    variantId: log.variantId,
    previousAvailable: log.oldStock - log.variant.reservedStock,
    nextAvailable: log.newStock - log.variant.reservedStock,
    transitionKey: log.id,
  });
}

export async function enqueuePriceDropAlerts(input: {
  productId: string;
  previousPrice: number;
  nextPrice: number;
  transitionKey: string;
}) {
  if (input.nextPrice >= input.previousPrice) return { queued: 0, suppressed: 0 };
  const subscriptions = await prisma.productAlertSubscription.findMany({
    where: { type: ProductAlertType.PRICE_DROP, status: "ACTIVE", productId: input.productId },
    select: { id: true, targetPrice: true, lastNotifiedAt: true },
  });
  const eligible = subscriptions.filter((subscription) => reachedPriceTarget(
    input.previousPrice,
    input.nextPrice,
    Number(subscription.targetPrice ?? input.previousPrice),
  ));
  const deliveries = await Promise.all(eligible.map((subscription) => createDelivery({
    subscriptionId: subscription.id,
    eventKey: `price:${subscription.id}:${input.transitionKey}`,
    triggerValue: input.nextPrice,
    lastNotifiedAt: subscription.lastNotifiedAt,
  })));
  return {
    queued: deliveries.filter((delivery) => delivery.status === "QUEUED").length,
    suppressed: deliveries.filter((delivery) => delivery.status === "SUPPRESSED").length,
  };
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[character] ?? character);
}

function alertMessage(delivery: {
  id: string;
  triggerValue: { toNumber?: () => number } | number | null;
  subscription: {
    type: ProductAlertType;
    product: { title: string; slug: string };
    variant: { color: { name: string }; size: { name: string } } | null;
  };
}) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const clickUrl = `${siteUrl}/api/product-alerts/click/${delivery.id}`;
  const productName = escapeHtml(delivery.subscription.product.title);
  const isStock = delivery.subscription.type === ProductAlertType.BACK_IN_STOCK;
  const variant = delivery.subscription.variant
    ? `${escapeHtml(delivery.subscription.variant.color.name)} / ${escapeHtml(delivery.subscription.variant.size.name)}`
    : "";
  const triggerValue = typeof delivery.triggerValue === "number"
    ? delivery.triggerValue
    : delivery.triggerValue?.toNumber?.();
  const subject = isStock ? `${delivery.subscription.product.title} is back in stock` : `Price drop on ${delivery.subscription.product.title}`;
  const detail = isStock
    ? `${productName}${variant ? ` in ${variant}` : ""} is available again.`
    : `${productName} is now AED ${Number(triggerValue ?? 0).toFixed(0)}.`;
  return {
    subject,
    html: `<div style="background:#f7f5f2;padding:32px;font-family:Arial,sans-serif;color:#111315"><div style="max-width:560px;margin:auto;background:#fff;padding:32px"><p style="letter-spacing:.22em;color:#c5a46d">VELORA</p><h1 style="font-size:28px">${isStock ? "Back in stock" : "Price drop"}</h1><p style="line-height:1.7">${detail}</p><a href="${clickUrl}" style="display:inline-block;margin-top:18px;background:#111315;color:#fff;padding:14px 22px;text-decoration:none">View product</a><p style="margin-top:24px;font-size:12px;color:#5f646d">You requested this alert on the product page.</p></div></div>`,
  };
}

export async function processProductAlertQueue(limit = 50) {
  const now = new Date();
  const due = await prisma.productAlertDelivery.findMany({
    where: {
      status: { in: ["QUEUED", "FAILED"] },
      nextAttemptAt: { lte: now },
      attempts: { lt: 3 },
      subscription: { status: "ACTIVE" },
    },
    orderBy: { createdAt: "asc" },
    take: Math.min(Math.max(limit, 1), 100),
    include: {
      subscription: {
        include: {
          product: { select: { title: true, slug: true } },
          variant: { include: { color: true, size: true } },
        },
      },
    },
  });
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const delivery of due) {
    const claimed = await prisma.productAlertDelivery.updateMany({
      where: { id: delivery.id, status: delivery.status, attempts: delivery.attempts },
      data: { status: "PROCESSING", attempts: { increment: 1 }, error: null },
    });
    if (!claimed.count) {
      skipped += 1;
      continue;
    }

    const attempt = delivery.attempts + 1;
    const message = alertMessage(delivery);
    const email = await deliverEmail({
      recipient: delivery.subscription.email,
      subject: message.subject,
      html: message.html,
      sourceKey: `product-alert:${delivery.id}:${attempt}`,
      metadata: {
        productAlertDeliveryId: delivery.id,
        productId: delivery.subscription.productId,
        alertType: delivery.subscription.type,
      },
    });
    const delivered = email.status === "SENT" || email.status === "DRY_RUN";
    if (delivered) {
      await prisma.$transaction([
        prisma.productAlertDelivery.update({
          where: { id: delivery.id },
          data: { status: "SENT", sentAt: new Date(), emailDeliveryId: email.id, error: null },
        }),
        prisma.productAlertSubscription.update({
          where: { id: delivery.subscriptionId },
          data: { lastNotifiedAt: new Date() },
        }),
      ]);
      sent += 1;
    } else {
      const exhausted = attempt >= delivery.maxAttempts;
      await prisma.productAlertDelivery.update({
        where: { id: delivery.id },
        data: {
          status: exhausted ? "EXHAUSTED" : "FAILED",
          emailDeliveryId: email.id,
          error: email.error ?? "Email delivery failed",
          nextAttemptAt: new Date(Date.now() + RETRY_BASE_MINUTES * 60_000 * 2 ** (attempt - 1)),
        },
      });
      failed += 1;
    }
  }

  return { processed: due.length, sent, failed, skipped };
}

export type ProductAlertQueueRow = {
  id: string;
  email: string;
  type: ProductAlertType;
  productName: string;
  variantLabel?: string;
  status: string;
  attempts: number;
  maxAttempts: number;
  suppressionReason?: string;
  error?: string;
  sentAt?: string;
  clickedAt?: string;
  convertedAt?: string;
  createdAt: string;
};

export async function getProductAlertQueueRows(limit = 100): Promise<ProductAlertQueueRow[]> {
  const rows = await prisma.productAlertDelivery.findMany({
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(limit, 1), 250),
    include: {
      subscription: {
        include: {
          product: { select: { title: true } },
          variant: { include: { color: true, size: true } },
        },
      },
    },
  });
  return rows.map((row) => ({
    id: row.id,
    email: row.subscription.email,
    type: row.subscription.type,
    productName: row.subscription.product.title,
    variantLabel: row.subscription.variant
      ? `${row.subscription.variant.color.name} / ${row.subscription.variant.size.name}`
      : undefined,
    status: row.status,
    attempts: row.attempts,
    maxAttempts: row.maxAttempts,
    suppressionReason: row.suppressionReason ?? undefined,
    error: row.error ?? undefined,
    sentAt: row.sentAt?.toISOString(),
    clickedAt: row.clickedAt?.toISOString(),
    convertedAt: row.convertedAt?.toISOString(),
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function attributeProductAlertConversions(input: { email: string; productIds: string[] }) {
  const productIds = Array.from(new Set(input.productIds.filter(Boolean)));
  if (!productIds.length) return 0;
  const result = await prisma.productAlertDelivery.updateMany({
    where: {
      status: "SENT",
      clickedAt: { not: null },
      convertedAt: null,
      createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60_000) },
      subscription: {
        email: input.email.toLowerCase(),
        productId: { in: productIds },
      },
    },
    data: { convertedAt: new Date() },
  });
  return result.count;
}
