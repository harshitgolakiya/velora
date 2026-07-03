import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApiPermission } from "@/lib/admin-api";
import { recordAdminActivity } from "@/lib/admin-activity";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  subject: z.string().trim().min(1).max(200),
  bodyHtml: z.string().trim().min(10),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
});

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApiPermission("marketing:write");
  if ("response" in auth) return auth.response;
  const { id } = await params;
  const template = await prisma.emailTemplate.findUnique({
    where: { id },
    include: { versions: { orderBy: { version: "desc" }, take: 30 } },
  });
  if (!template) return NextResponse.json({ message: "Template not found" }, { status: 404 });
  return NextResponse.json({ template });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApiPermission("marketing:write");
  if ("response" in auth) return auth.response;
  const { id } = await params;
  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ message: "Invalid template payload" }, { status: 400 });
  const current = await prisma.emailTemplate.findUnique({ where: { id } });
  if (!current) return NextResponse.json({ message: "Template not found" }, { status: 404 });
  const nextVersion = current.version + 1;
  const template = await prisma.emailTemplate.update({
    where: { id },
    data: {
      ...parsed.data,
      version: nextVersion,
      updatedBy: auth.access.email,
      versions: {
        create: {
          version: nextVersion,
          subject: parsed.data.subject,
          bodyHtml: parsed.data.bodyHtml,
          status: parsed.data.status,
          createdBy: auth.access.email,
        },
      },
    },
    include: { versions: { orderBy: { version: "desc" }, take: 30 } },
  });
  await recordAdminActivity({
    actor: auth.access.email,
    action: "email_template.updated",
    entityType: "EmailTemplate",
    entityId: id,
    metadata: { type: template.type, locale: template.locale, status: template.status, version: template.version },
  });
  return NextResponse.json({ template });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApiPermission("marketing:write");
  if ("response" in auth) return auth.response;
  const { id } = await params;
  const template = await prisma.emailTemplate.delete({ where: { id } });
  await recordAdminActivity({
    actor: auth.access.email,
    action: "email_template.deleted",
    entityType: "EmailTemplate",
    entityId: id,
    metadata: { type: template.type, locale: template.locale },
  });
  return NextResponse.json({ ok: true });
}
