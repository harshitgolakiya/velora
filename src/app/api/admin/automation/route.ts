import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApiPermission } from "@/lib/admin-api";
import { recordAdminActivity } from "@/lib/admin-activity";
import { prisma } from "@/lib/prisma";
import { retryEmailDelivery } from "@/lib/email-delivery";
import { processDueAutomationEvents } from "@/lib/automation-events";

const integrationSchema = z.object({
  entity: z.literal("integration"),
  provider: z.enum(["KLAVIYO", "MAILCHIMP"]),
  enabled: z.boolean(),
  listId: z.string().trim().optional().nullable(),
  apiKeyEnv: z.string().trim().optional().nullable(),
});

const workflowSchema = z.object({
  entity: z.literal("workflow"),
  type: z.enum(["WELCOME", "ABANDONED_CART", "POST_PURCHASE", "REVIEW_REQUEST"]),
  enabled: z.boolean(),
  provider: z.string().optional().nullable(),
  delayHours: z.coerce.number().int().min(0).max(8760),
  subject: z.string().trim().max(200).optional().nullable(),
});

const reportSchema = z.object({
  entity: z.literal("report"),
  name: z.string().trim().min(1),
  reportType: z.enum(["SALES", "INVENTORY", "ORDERS", "COUPONS"]),
  frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY"]),
  recipients: z.string().trim().min(3),
});

const runSchema = z.object({
  entity: z.literal("run"),
  workflowType: z.enum(["WELCOME", "ABANDONED_CART", "POST_PURCHASE", "REVIEW_REQUEST"]).optional(),
});

const retrySchema = z.object({
  entity: z.literal("retry-delivery"),
  deliveryId: z.string().min(1),
});

export async function POST(request: Request) {
  const auth = await requireAdminApiPermission("marketing:write");
  if ("response" in auth) return auth.response;
  const payload = await request.json();

  const retry = retrySchema.safeParse(payload);
  if (retry.success) {
    try {
      const delivery = await retryEmailDelivery(retry.data.deliveryId);
      await recordAdminActivity({
        action: `Retried email delivery (${delivery.status})`,
        entityType: "email-delivery",
        entityId: delivery.id,
        actor: auth.access.name,
        metadata: { recipient: delivery.recipient, status: delivery.status },
      });
      return NextResponse.json({ delivery });
    } catch (error) {
      return NextResponse.json({ message: error instanceof Error ? error.message : "Unable to retry delivery" }, { status: 400 });
    }
  }

  const run = runSchema.safeParse(payload);
  if (run.success) {
    const result = await processDueAutomationEvents({ type: run.data.workflowType });

    await recordAdminActivity({
      action: `Ran email automation (${result.sent} processed, ${result.skipped} skipped, ${result.retried} retried)`,
      entityType: "automation",
      actor: auth.access.name,
      metadata: { ...result, workflowType: run.data.workflowType },
    });
    const deliveries = await prisma.emailDelivery.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        workflow: { select: { name: true } },
        order: { select: { orderNumber: true } },
      },
    });
    const events = await prisma.automationEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return NextResponse.json({
      sent: result.sent,
      skipped: result.skipped,
      failed: result.failed,
      retried: result.retried,
      events: events.map((event) => ({
        id: event.id,
        type: event.type,
        sourceKey: event.sourceKey,
        recipient: event.recipient,
        status: event.status,
        scheduledAt: event.scheduledAt.toISOString(),
        processedAt: event.processedAt?.toISOString(),
        skippedAt: event.skippedAt?.toISOString(),
        error: event.error,
        orderId: event.orderId,
        cartId: event.cartId,
        createdAt: event.createdAt.toISOString(),
      })),
      deliveries: deliveries.map((delivery) => ({
        id: delivery.id,
        recipient: delivery.recipient,
        subject: delivery.subject,
        provider: delivery.provider,
        status: delivery.status,
        error: delivery.error,
        eventType: delivery.eventType,
        attempts: delivery.attempts,
        maxAttempts: delivery.maxAttempts,
        nextAttemptAt: delivery.nextAttemptAt?.toISOString(),
        suppressionReason: delivery.suppressionReason,
        clickedAt: delivery.clickedAt?.toISOString(),
        convertedAt: delivery.convertedAt?.toISOString(),
        conversionValue: delivery.conversionValue ? Number(delivery.conversionValue) : undefined,
        sentAt: delivery.sentAt?.toISOString(),
        createdAt: delivery.createdAt.toISOString(),
        workflowName: delivery.workflow?.name,
        orderNumber: delivery.order?.orderNumber,
      })),
    });
  }

  const integration = integrationSchema.safeParse(payload);
  if (integration.success) {
    const row = await prisma.emailIntegration.upsert({
      where: { provider: integration.data.provider },
      create: {
        provider: integration.data.provider,
        enabled: integration.data.enabled,
        listId: integration.data.listId || null,
        apiKeyEnv: integration.data.apiKeyEnv || `${integration.data.provider}_API_KEY`,
      },
      update: {
        enabled: integration.data.enabled,
        listId:
          integration.data.listId === undefined
            ? undefined
            : integration.data.listId || null,
        apiKeyEnv:
          integration.data.apiKeyEnv === undefined
            ? undefined
            : integration.data.apiKeyEnv || `${integration.data.provider}_API_KEY`,
      },
    });
    await recordAdminActivity({
      action: `Updated ${row.provider} integration`,
      entityType: "automation",
      entityId: row.id,
      actor: auth.access.name,
      metadata: { enabled: row.enabled, listId: row.listId },
    });
    return NextResponse.json({ integration: row });
  }

  const workflow = workflowSchema.safeParse(payload);
  if (workflow.success) {
    const names = {
      WELCOME: "Welcome email",
      ABANDONED_CART: "Abandoned cart recovery",
      POST_PURCHASE: "Post-purchase follow-up",
      REVIEW_REQUEST: "Verified review request",
    };
    const row = await prisma.automationWorkflow.upsert({
      where: { type: workflow.data.type },
      create: {
        name: names[workflow.data.type],
        type: workflow.data.type,
        enabled: workflow.data.enabled,
        provider: workflow.data.provider || null,
        delayHours: workflow.data.delayHours,
        subject: workflow.data.subject || null,
      },
      update: {
        enabled: workflow.data.enabled,
        provider: workflow.data.provider || null,
        delayHours: workflow.data.delayHours,
        subject: workflow.data.subject || null,
      },
    });
    return NextResponse.json({ workflow: row });
  }

  const report = reportSchema.safeParse(payload);
  if (report.success) {
    const nextRunAt = new Date();
    nextRunAt.setDate(nextRunAt.getDate() + (report.data.frequency === "DAILY" ? 1 : report.data.frequency === "WEEKLY" ? 7 : 30));
    const row = await prisma.scheduledReport.create({
      data: { ...report.data, nextRunAt },
    });
    return NextResponse.json({ report: row }, { status: 201 });
  }

  return NextResponse.json({ message: "Invalid automation payload" }, { status: 400 });
}
