import { redirect } from "next/navigation";
import { EmailTemplateManager } from "@/components/admin/email-template-manager";
import { ensureDefaultEmailTemplates } from "@/lib/email-templates";
import { getAdminAccess } from "@/lib/admin-permissions";
import { prisma } from "@/lib/prisma";

export default async function AdminEmailTemplatesPage() {
  const access = await getAdminAccess();
  if (!access) redirect("/admin-login?callbackUrl=/admin/email-templates");
  await ensureDefaultEmailTemplates();
  const templates = await prisma.emailTemplate.findMany({
    orderBy: [{ type: "asc" }, { locale: "asc" }],
    include: { versions: { orderBy: { version: "desc" }, take: 20 } },
  });
  return (
    <EmailTemplateManager
      adminEmail={access.email}
      templates={templates.map((template) => ({
        id: template.id,
        type: template.type,
        locale: template.locale,
        name: template.name,
        subject: template.subject,
        bodyHtml: template.bodyHtml,
        status: template.status,
        version: template.version,
        updatedAt: template.updatedAt.toISOString(),
        versions: template.versions.map((version) => ({
          id: version.id,
          version: version.version,
          status: version.status,
          createdAt: version.createdAt.toISOString(),
          createdBy: version.createdBy,
        })),
      }))}
    />
  );
}
