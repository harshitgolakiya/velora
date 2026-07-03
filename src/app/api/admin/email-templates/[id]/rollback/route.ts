import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApiPermission } from "@/lib/admin-api";
import { recordAdminActivity } from "@/lib/admin-activity";
import { prisma } from "@/lib/prisma";

const rollbackSchema = z.object({
  version: z.coerce.number().int().min(1),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApiPermission("marketing:write");
  if ("response" in auth) return auth.response;
  const parsed = rollbackSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ message: "Invalid version" }, { status: 400 });
  const { id } = await params;
  const current = await prisma.emailTemplate.findUnique({ where: { id } });
  if (!current) return NextResponse.json({ message: "Template not found" }, { status: 404 });
  const version = await prisma.emailTemplateVersion.findUnique({
    where: { templateId_version: { templateId: id, version: parsed.data.version } },
  });
  if (!version) return NextResponse.json({ message: "Version not found" }, { status: 404 });
  const nextVersion = current.version + 1;
  const template = await prisma.emailTemplate.update({
    where: { id },
    data: {
      subject: version.subject,
      bodyHtml: version.bodyHtml,
      status: "DRAFT",
      version: nextVersion,
      updatedBy: auth.access.email,
      versions: {
        create: {
          version: nextVersion,
          subject: version.subject,
          bodyHtml: version.bodyHtml,
          status: "DRAFT",
          createdBy: auth.access.email,
        },
      },
    },
    include: { versions: { orderBy: { version: "desc" }, take: 30 } },
  });
  await recordAdminActivity({
    actor: auth.access.email,
    action: "email_template.rolled_back",
    entityType: "EmailTemplate",
    entityId: id,
    metadata: { fromVersion: current.version, restoredVersion: version.version, newVersion: nextVersion },
  });
  return NextResponse.json({ template });
}
