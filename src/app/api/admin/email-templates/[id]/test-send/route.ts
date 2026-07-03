import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApiPermission } from "@/lib/admin-api";
import { recordAdminActivity } from "@/lib/admin-activity";
import { deliverEmail } from "@/lib/email-delivery";
import { renderEmailTemplate } from "@/lib/email-templates";
import { prisma } from "@/lib/prisma";

const sendSchema = z.object({
  recipient: z.string().trim().email(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApiPermission("marketing:write");
  if ("response" in auth) return auth.response;
  const parsed = sendSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ message: "Enter a valid test recipient" }, { status: 400 });
  const { id } = await params;
  const template = await prisma.emailTemplate.findUnique({ where: { id } });
  if (!template) return NextResponse.json({ message: "Template not found" }, { status: 404 });
  const context = {
    type: template.type,
    locale: template.locale,
    customerName: "Amira",
    orderNumber: "VL-2026-1042",
    cartValue: 420,
    productName: "Soft Leggings",
    productSlug: "soft-leggings",
    recipient: parsed.data.recipient,
    marketing: false,
  };
  const delivery = await deliverEmail({
    recipient: parsed.data.recipient,
    subject: `[Test] ${renderEmailTemplate(template.subject, context)}`,
    html: renderEmailTemplate(template.bodyHtml, context),
    eventType: "TEMPLATE_TEST",
    maxAttempts: 1,
    metadata: { templateId: template.id, templateVersion: template.version, locale: template.locale, test: true },
  });
  await recordAdminActivity({
    actor: auth.access.email,
    action: "email_template.test_sent",
    entityType: "EmailTemplate",
    entityId: template.id,
    metadata: { recipient: parsed.data.recipient, deliveryId: delivery.id, status: delivery.status },
  });
  return NextResponse.json({ delivery });
}
