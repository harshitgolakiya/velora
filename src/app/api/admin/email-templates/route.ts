import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApiPermission } from "@/lib/admin-api";
import { recordAdminActivity } from "@/lib/admin-activity";
import { prisma } from "@/lib/prisma";
import { defaultEmailTemplates, ensureDefaultEmailTemplates, workflowEmailTypes } from "@/lib/email-templates";

const createSchema = z.object({
  type: z.enum(workflowEmailTypes),
  locale: z.string().trim().min(2).max(12).default("en"),
});

export async function GET() {
  const auth = await requireAdminApiPermission("marketing:write");
  if ("response" in auth) return auth.response;
  await ensureDefaultEmailTemplates();
  const templates = await prisma.emailTemplate.findMany({
    orderBy: [{ type: "asc" }, { locale: "asc" }],
    include: { _count: { select: { versions: true } } },
  });
  return NextResponse.json({ templates });
}

export async function POST(request: Request) {
  const auth = await requireAdminApiPermission("marketing:write");
  if ("response" in auth) return auth.response;
  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ message: "Invalid template payload" }, { status: 400 });
  const defaults = defaultEmailTemplates[parsed.data.type];
  const template = await prisma.emailTemplate.create({
    data: {
      type: parsed.data.type,
      locale: parsed.data.locale,
      name: `${defaults.name} (${parsed.data.locale})`,
      subject: defaults.subject,
      bodyHtml: defaults.bodyHtml,
      status: "DRAFT",
      createdBy: auth.access.email,
      updatedBy: auth.access.email,
      versions: {
        create: {
          version: 1,
          subject: defaults.subject,
          bodyHtml: defaults.bodyHtml,
          status: "DRAFT",
          createdBy: auth.access.email,
        },
      },
    },
  });
  await recordAdminActivity({
    actor: auth.access.email,
    action: "email_template.created",
    entityType: "EmailTemplate",
    entityId: template.id,
    metadata: { type: template.type, locale: template.locale },
  });
  return NextResponse.json({ template }, { status: 201 });
}
