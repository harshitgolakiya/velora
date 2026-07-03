import "server-only";

import { prisma } from "./prisma";
import { deliverEmail, retryEmailDelivery, workflowEmailMessage } from "./email-delivery";

const marketingTypes = new Set(["WELCOME", "ABANDONED_CART"]);

export type AutomationEventInput = {
  type: "WELCOME" | "ABANDONED_CART" | "POST_PURCHASE" | "REVIEW_REQUEST";
  sourceKey: string;
  recipient: string;
  orderId?: string;
  cartId?: string;
  metadata?: Record<string, unknown>;
};

function parseMetadata(value?: string | null) {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export async function queueAutomationEvent(input: AutomationEventInput) {
  const workflow = await prisma.automationWorkflow.findUnique({
    where: { type: input.type },
    select: { enabled: true, delayHours: true },
  });
  const scheduledAt = new Date(Date.now() + (workflow?.delayHours ?? 0) * 60 * 60_000);
  return prisma.automationEvent.upsert({
    where: { sourceKey: input.sourceKey },
    create: {
      type: input.type,
      sourceKey: input.sourceKey,
      recipient: input.recipient.toLowerCase(),
      orderId: input.orderId,
      cartId: input.cartId,
      status: workflow?.enabled === false ? "SKIPPED_DISABLED" : "PENDING",
      scheduledAt,
      skippedAt: workflow?.enabled === false ? new Date() : null,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
    },
    update: {},
  });
}

export async function processDueAutomationEvents(options: { type?: string; limit?: number } = {}) {
  const dueRetries = await prisma.emailDelivery.findMany({
    where: { status: "RETRYING", nextAttemptAt: { lte: new Date() } },
    select: { id: true },
    take: options.limit ?? 100,
  });
  for (const delivery of dueRetries) await retryEmailDelivery(delivery.id);

  const events = await prisma.automationEvent.findMany({
    where: {
      status: "PENDING",
      scheduledAt: { lte: new Date() },
      ...(options.type ? { type: options.type } : {}),
    },
    orderBy: { scheduledAt: "asc" },
    take: options.limit ?? 100,
  });

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const event of events) {
    try {
      const workflow = await prisma.automationWorkflow.findUnique({ where: { type: event.type } });
      if (!workflow?.enabled) {
        skipped += 1;
        await prisma.automationEvent.update({
          where: { id: event.id },
          data: { status: "SKIPPED_DISABLED", skippedAt: new Date(), error: "Workflow disabled" },
        });
        continue;
      }

      const existing = await prisma.emailDelivery.findUnique({
        where: { sourceKey: event.sourceKey },
        select: { id: true },
      });
      if (existing) {
        skipped += 1;
        await prisma.automationEvent.update({
          where: { id: event.id },
          data: { status: "SKIPPED_DUPLICATE", skippedAt: new Date(), error: "Delivery already exists" },
        });
        continue;
      }

      const metadata = parseMetadata(event.metadata);
      const message = await workflowEmailMessage({
        type: event.type,
        subject: workflow.subject,
        orderNumber: stringValue(metadata.orderNumber),
        customerName: stringValue(metadata.customerName),
        cartValue: numberValue(metadata.cartValue),
        productName: stringValue(metadata.productName),
        productSlug: stringValue(metadata.productSlug),
        recipient: event.recipient,
        marketing: marketingTypes.has(event.type),
        locale: stringValue(metadata.locale),
      });
      await deliverEmail({
        recipient: event.recipient,
        subject: message.subject,
        html: message.html,
        workflowId: workflow.id,
        orderId: event.orderId ?? undefined,
        sourceKey: event.sourceKey,
        eventType: event.type,
        requiresMarketingConsent: marketingTypes.has(event.type),
        metadata: {
          ...metadata,
          automationEventId: event.id,
          workflowType: event.type,
          templateId: "templateId" in message ? message.templateId : undefined,
          templateVersion: "templateVersion" in message ? message.templateVersion : undefined,
          locale: "locale" in message ? message.locale : undefined,
        },
      });
      sent += 1;
      await prisma.automationEvent.update({
        where: { id: event.id },
        data: { status: "PROCESSED", processedAt: new Date(), error: null },
      });
    } catch (error) {
      failed += 1;
      await prisma.automationEvent.update({
        where: { id: event.id },
        data: {
          status: "FAILED",
          processedAt: new Date(),
          error: error instanceof Error ? error.message : "Automation event failed",
        },
      });
    }
  }

  return { sent, skipped, failed, retried: dueRetries.length, events: events.length };
}
