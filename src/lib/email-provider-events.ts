import "server-only";

import { createHash } from "node:crypto";
import { prisma } from "./prisma";

export type EmailProviderEventInput = {
  provider: string;
  providerEventId?: string;
  eventType: string;
  recipient: string;
  providerRef?: string | null;
  sourceKey?: string | null;
  message?: string | null;
  payload?: unknown;
  occurredAt?: Date;
};

const hardSuppressions: Record<string, string> = {
  BOUNCE: "EMAIL_BOUNCED",
  HARD_BOUNCE: "EMAIL_BOUNCED",
  COMPLAINT: "SPAM_COMPLAINT",
  SPAM_COMPLAINT: "SPAM_COMPLAINT",
};

const unsubscribeEvents = new Set(["UNSUBSCRIBE", "UNSUBSCRIBED", "GROUP_UNSUBSCRIBE"]);
const failureEvents = new Set(["BOUNCE", "HARD_BOUNCE", "COMPLAINT", "SPAM_COMPLAINT", "FAILED", "DROPPED"]);

function normalizeType(value: string) {
  return value.trim().toUpperCase().replaceAll("-", "_").replaceAll(".", "_");
}

function eventId(input: EmailProviderEventInput) {
  if (input.providerEventId) return input.providerEventId;
  return createHash("sha256")
    .update([
      input.provider,
      input.eventType,
      input.recipient.toLowerCase(),
      input.providerRef ?? "",
      input.sourceKey ?? "",
      input.message ?? "",
      input.occurredAt?.toISOString() ?? "",
    ].join("|"))
    .digest("hex");
}

function payloadString(payload: unknown) {
  if (payload == null) return null;
  try {
    return JSON.stringify(payload).slice(0, 20_000);
  } catch {
    return null;
  }
}

export async function reconcileEmailProviderEvent(input: EmailProviderEventInput) {
  const type = normalizeType(input.eventType);
  const recipient = input.recipient.toLowerCase();
  const provider = input.provider.trim().toUpperCase();
  const delivery = input.providerRef
    ? await prisma.emailDelivery.findFirst({ where: { providerRef: input.providerRef } })
    : input.sourceKey
      ? await prisma.emailDelivery.findUnique({ where: { sourceKey: input.sourceKey } })
      : await prisma.emailDelivery.findFirst({
          where: { recipient },
          orderBy: { createdAt: "desc" },
        });
  const severity = failureEvents.has(type) ? "HIGH" : unsubscribeEvents.has(type) ? "MEDIUM" : "INFO";
  const alertStatus = failureEvents.has(type) ? "OPEN" : "NONE";

  const providerEvent = await prisma.emailProviderEvent.upsert({
    where: { provider_providerEventId: { provider, providerEventId: eventId({ ...input, eventType: type }) } },
    create: {
      provider,
      providerEventId: eventId({ ...input, eventType: type }),
      eventType: type,
      recipient,
      deliveryId: delivery?.id,
      sourceKey: input.sourceKey ?? delivery?.sourceKey ?? null,
      severity,
      alertStatus,
      message: input.message ?? null,
      payload: payloadString(input.payload),
      occurredAt: input.occurredAt ?? new Date(),
    },
    update: {},
  });

  if (hardSuppressions[type]) {
    await prisma.newsletterSubscriber.upsert({
      where: { email: recipient },
      create: {
        email: recipient,
        status: "SUPPRESSED",
        source: provider.toLowerCase(),
        consentSource: provider.toLowerCase(),
        suppressionReason: hardSuppressions[type],
        lastSyncAt: new Date(),
        lastSyncStatus: `PROVIDER_${type}`,
      },
      update: {
        status: "SUPPRESSED",
        unsubscribedAt: new Date(),
        suppressionReason: hardSuppressions[type],
        lastSyncAt: new Date(),
        lastSyncStatus: `PROVIDER_${type}`,
      },
    });
  } else if (unsubscribeEvents.has(type)) {
    await prisma.newsletterSubscriber.upsert({
      where: { email: recipient },
      create: {
        email: recipient,
        status: "UNSUBSCRIBED",
        source: provider.toLowerCase(),
        consentSource: provider.toLowerCase(),
        unsubscribedAt: new Date(),
        suppressionReason: "PROVIDER_UNSUBSCRIBE",
        lastSyncAt: new Date(),
        lastSyncStatus: `PROVIDER_${type}`,
      },
      update: {
        status: "UNSUBSCRIBED",
        unsubscribedAt: new Date(),
        suppressionReason: "PROVIDER_UNSUBSCRIBE",
        lastSyncAt: new Date(),
        lastSyncStatus: `PROVIDER_${type}`,
      },
    });
  }

  if (delivery && failureEvents.has(type)) {
    await prisma.emailDelivery.update({
      where: { id: delivery.id },
      data: {
        status: type.includes("COMPLAINT") ? "COMPLAINED" : type.includes("BOUNCE") ? "BOUNCED" : "FAILED",
        error: input.message ?? `Provider event: ${type}`,
        suppressionReason: hardSuppressions[type] ?? undefined,
        failureAlertedAt: new Date(),
      },
    });
  }

  return providerEvent;
}

export async function recordEmailFailureAlert(input: {
  deliveryId: string;
  recipient: string;
  provider: string;
  message: string;
  sourceKey?: string | null;
}) {
  return reconcileEmailProviderEvent({
    provider: input.provider,
    providerEventId: `delivery-failure:${input.deliveryId}`,
    eventType: "FAILED",
    recipient: input.recipient,
    sourceKey: input.sourceKey,
    message: input.message,
    payload: { deliveryId: input.deliveryId },
  });
}
