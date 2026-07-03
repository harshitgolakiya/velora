import { NextResponse } from "next/server";
import { requireAdminApiPermission } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import { renderEmailTemplate } from "@/lib/email-templates";

const sample = {
  type: "WELCOME",
  customerName: "Amira",
  orderNumber: "VL-2026-1042",
  cartValue: 420,
  productName: "Soft Leggings",
  productSlug: "soft-leggings",
  recipient: "customer@example.com",
  marketing: true,
};

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApiPermission("marketing:write");
  if ("response" in auth) return auth.response;
  const { id } = await params;
  const template = await prisma.emailTemplate.findUnique({ where: { id } });
  if (!template) return NextResponse.json({ message: "Template not found" }, { status: 404 });
  const context = { ...sample, type: template.type, locale: template.locale };
  return NextResponse.json({
    subject: renderEmailTemplate(template.subject, context),
    html: renderEmailTemplate(template.bodyHtml, context),
  });
}
