import { notFound, redirect } from "next/navigation";
import { ContentEditor } from "@/components/admin/content-editor";
import { getAdminAccess } from "@/lib/admin-permissions";
import { mapPageContent } from "@/lib/content-cms";
import { prisma } from "@/lib/prisma";

export default async function AdminContentEditPage({ params }: { params: Promise<{ id: string }> }) {
  const access = await getAdminAccess();
  const { id } = await params;
  if (!access) redirect(`/admin-login?callbackUrl=/admin/content/${id}`);
  const row = await prisma.pageContent.findUnique({ where: { id }, include: { versions: { orderBy: { version: "desc" }, take: 30 } } });
  if (!row) notFound();
  const page = mapPageContent(row);
  return <ContentEditor initialPage={{
    id: page.id,
    slug: page.slug,
    title: page.title,
    summary: page.summary ?? undefined,
    body: page.body,
    blocks: page.blocks,
    contentType: page.contentType,
    status: page.status,
    locale: page.locale,
    seoTitle: page.seoTitle ?? undefined,
    seoDescription: page.seoDescription ?? undefined,
    socialImage: page.socialImage ?? undefined,
    scheduledAt: page.scheduledAt?.toISOString(),
    versions: page.versions.map((version) => ({ id: version.id, version: version.version, createdBy: version.createdBy, createdAt: version.createdAt.toISOString(), status: version.status })),
  }} />;
}
