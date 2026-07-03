import { Resend } from "resend";
import { SMTPClient } from "emailjs";
import { ImapFlow } from "imapflow";
import { prisma } from "./prisma";
import { fallbackWorkflowEmail, workflowEmailFromTemplate, type WorkflowEmailContext } from "./email-templates";
import { recordEmailFailureAlert } from "./email-provider-events";

type DeliveryInput = {
  recipient: string;
  subject: string;
  html: string;
  workflowId?: string;
  orderId?: string;
  sourceKey?: string;
  metadata?: Record<string, unknown>;
  eventType?: string;
  requiresMarketingConsent?: boolean;
  maxAttempts?: number;
};

const conversionEventTypes = ["WELCOME", "ABANDONED_CART", "POST_PURCHASE", "REVIEW_REQUEST"];

function cleanHeader(value: string) {
  return value.replace(/[\r\n]+/g, " ").trim();
}

function encodeHeader(value: string) {
  return `=?UTF-8?B?${Buffer.from(cleanHeader(value)).toString("base64")}?=`;
}

function wrapBase64(value: string) {
  return Buffer.from(value)
    .toString("base64")
    .match(/.{1,76}/g)
    ?.join("\r\n") ?? "";
}

function buildSentMessage(input: {
  from: string;
  to: string;
  subject: string;
  html: string;
  messageId: string;
  sentAt: Date;
}) {
  return [
    `From: ${cleanHeader(input.from)}`,
    `To: ${cleanHeader(input.to)}`,
    `Subject: ${encodeHeader(input.subject)}`,
    `Date: ${input.sentAt.toUTCString()}`,
    `Message-ID: <${cleanHeader(input.messageId)}>`,
    "MIME-Version: 1.0",
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    wrapBase64(input.html),
    "",
  ].join("\r\n");
}

function trackedHtml(deliveryId: string, html: string) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return html.replace(/href="(https?:\/\/[^"]+|\/[^"]+)"/g, (_match, href: string) => {
    if (href.includes("/api/email/click/") || href.startsWith("mailto:") || href.startsWith("#")) return `href="${href}"`;
    const absolute = href.startsWith("/") ? `${siteUrl}${href}` : href;
    return `href="${siteUrl}/api/email/click/${encodeURIComponent(deliveryId)}?to=${encodeURIComponent(absolute)}"`;
  });
}

async function appendToSentMailbox(input: {
  from: string;
  to: string;
  subject: string;
  html: string;
  messageId: string;
  sentAt: Date;
}) {
  const host = process.env.IMAP_HOST ?? process.env.SMTP_HOST;
  const user = process.env.IMAP_USER ?? process.env.SMTP_USER;
  const password = process.env.IMAP_PASSWORD ?? process.env.SMTP_PASSWORD;
  if (!host || !user || !password) return false;

  const client = new ImapFlow({
    host,
    port: Number(process.env.IMAP_PORT ?? 993),
    secure: true,
    servername: host,
    auth: { user, pass: password },
    tls: { servername: host, rejectUnauthorized: true },
    logger: false,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });

  try {
    await client.connect();
    const result = await client.append(
      process.env.IMAP_SENT_MAILBOX ?? "INBOX.Sent",
      buildSentMessage(input),
      ["\\Seen"],
      input.sentAt,
    );
    return Boolean(result);
  } finally {
    if (client.usable) await client.logout();
  }
}

async function attemptDelivery(delivery: {
  id: string;
  recipient: string;
  subject: string;
  provider: string;
  attempts: number;
  maxAttempts: number;
  sourceKey?: string | null;
}, html: string, metadata?: Record<string, unknown>) {
  const attemptNumber = delivery.attempts + 1;
  await prisma.emailDelivery.update({
    where: { id: delivery.id },
    data: {
      status: "PROCESSING",
      attempts: attemptNumber,
      processingAt: new Date(),
      lastAttemptAt: new Date(),
      nextAttemptAt: null,
      error: null,
    },
  });

  if (delivery.provider === "DRY_RUN") {
    return prisma.emailDelivery.update({
      where: { id: delivery.id },
      data: { status: "DRY_RUN", sentAt: new Date(), providerRef: `dry_${delivery.id}`, processingAt: null },
    });
  }

  try {
    if (delivery.provider === "CPANEL_SMTP") {
      const port = Number(process.env.SMTP_PORT ?? 465);
      const secure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465;
      const client = new SMTPClient({
        host: process.env.SMTP_HOST,
        port,
        domain: process.env.SMTP_DOMAIN ?? "ccea.ae",
        ssl: secure ? { servername: process.env.SMTP_HOST, rejectUnauthorized: true } : false,
        tls: !secure ? { servername: process.env.SMTP_HOST, rejectUnauthorized: true } : false,
        user: process.env.SMTP_USER,
        password: process.env.SMTP_PASSWORD,
        timeout: 10_000,
      });
      const result = await client.sendAsync({
        from: process.env.SMTP_FROM ?? process.env.EMAIL_FROM ?? process.env.SMTP_USER!,
        to: delivery.recipient,
        subject: delivery.subject,
        text: "Open this message in an HTML-capable email client.",
        attachment: [{ data: html, alternative: true, contentType: "text/html" }],
      });
      const responseHeader = result.header as Record<string, unknown>;
      const messageId = typeof responseHeader?.["message-id"] === "string"
        ? responseHeader["message-id"].replace(/[<>]/g, "")
        : undefined;
      const providerRef = messageId ?? `smtp_${delivery.id}`;
      const sentAt = new Date();
      let sentCopy = "SAVED";
      let sentCopyError: string | undefined;
      try {
        const saved = await appendToSentMailbox({
          from: process.env.SMTP_FROM ?? process.env.EMAIL_FROM ?? process.env.SMTP_USER!,
          to: delivery.recipient,
          subject: delivery.subject,
          html,
          messageId: providerRef,
          sentAt,
        });
        if (!saved) sentCopy = "NOT_CONFIGURED";
      } catch (error) {
        sentCopy = "FAILED";
        sentCopyError = error instanceof Error ? error.message : "Unable to save sent copy";
      }
      return prisma.emailDelivery.update({
        where: { id: delivery.id },
        data: {
          status: "SENT",
          sentAt,
          providerRef,
          processingAt: null,
          metadata: JSON.stringify({ ...metadata, sentCopy, ...(sentCopyError ? { sentCopyError } : {}) }),
        },
      });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const result = await resend.emails.send({
      from: process.env.EMAIL_FROM ?? "Velora <orders@velora.ae>",
      to: delivery.recipient,
      subject: delivery.subject,
      html,
    });
    if (result.error) throw new Error(result.error.message);
    return prisma.emailDelivery.update({
      where: { id: delivery.id },
      data: { status: "SENT", sentAt: new Date(), providerRef: result.data?.id, processingAt: null },
    });
  } catch (error) {
    const retrying = attemptNumber < delivery.maxAttempts;
    const retryDelayMinutes = 15 * 2 ** Math.max(0, attemptNumber - 1);
    const failedDelivery = await prisma.emailDelivery.update({
      where: { id: delivery.id },
      data: {
        status: retrying ? "RETRYING" : "FAILED",
        error: error instanceof Error ? error.message : "Email delivery failed",
        processingAt: null,
        nextAttemptAt: retrying ? new Date(Date.now() + retryDelayMinutes * 60_000) : null,
      },
    });
    if (!retrying) {
      await recordEmailFailureAlert({
        deliveryId: delivery.id,
        recipient: delivery.recipient,
        provider: delivery.provider,
        sourceKey: delivery.sourceKey,
        message: failedDelivery.error ?? "Email delivery failed",
      });
    }
    return failedDelivery;
  }
}

export async function deliverEmail(input: DeliveryInput) {
  const hasSmtp =
    Boolean(process.env.SMTP_HOST) &&
    Boolean(process.env.SMTP_USER) &&
    Boolean(process.env.SMTP_PASSWORD);
  const provider = hasSmtp
    ? "CPANEL_SMTP"
    : process.env.RESEND_API_KEY
      ? "RESEND"
      : "DRY_RUN";
  const subscriber = input.requiresMarketingConsent
    ? await prisma.newsletterSubscriber.findUnique({ where: { email: input.recipient.toLowerCase() } })
    : null;
  const suppressionReason = input.requiresMarketingConsent && subscriber?.status !== "SUBSCRIBED"
    ? subscriber?.suppressionReason ?? "MARKETING_CONSENT_REQUIRED"
    : null;
  const delivery = await prisma.emailDelivery.create({
    data: {
      recipient: input.recipient.toLowerCase(),
      subject: input.subject,
      bodyHtml: input.html,
      provider,
      status: suppressionReason ? "SUPPRESSED" : "QUEUED",
      workflowId: input.workflowId,
      orderId: input.orderId,
      sourceKey: input.sourceKey,
      eventType: input.eventType,
      maxAttempts: input.maxAttempts ?? 3,
      suppressionReason,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
    },
  });

  if (suppressionReason) return delivery;
  const html = input.eventType ? trackedHtml(delivery.id, input.html) : input.html;
  await prisma.emailDelivery.update({ where: { id: delivery.id }, data: { bodyHtml: html } });
  return attemptDelivery(delivery, html, input.metadata);
}

export async function retryEmailDelivery(id: string) {
  const delivery = await prisma.emailDelivery.findUnique({ where: { id } });
  if (!delivery?.bodyHtml) throw new Error("Delivery content is unavailable for retry");
  if (!["RETRYING", "FAILED"].includes(delivery.status)) throw new Error("Delivery is not retryable");
  const metadata = delivery.metadata ? JSON.parse(delivery.metadata) as Record<string, unknown> : undefined;
  return attemptDelivery(delivery, delivery.bodyHtml, metadata);
}

export function workflowEmail(input: WorkflowEmailContext) {
  return fallbackWorkflowEmail(input);
}

export async function workflowEmailMessage(input: WorkflowEmailContext) {
  return workflowEmailFromTemplate(input);
}

export async function markEmailClicked(id: string) {
  return prisma.emailDelivery.updateMany({
    where: { id, clickedAt: null },
    data: { clickedAt: new Date() },
  });
}

export async function attributeAutomationConversions(input: {
  email: string;
  orderId: string;
  orderTotal: number;
}) {
  const result = await prisma.emailDelivery.updateMany({
    where: {
      recipient: input.email.toLowerCase(),
      eventType: { in: conversionEventTypes },
      status: { in: ["SENT", "DRY_RUN"] },
      convertedAt: null,
      createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60_000) },
    },
    data: {
      convertedAt: new Date(),
      conversionOrderId: input.orderId,
      conversionValue: input.orderTotal,
    },
  });
  return result.count;
}
