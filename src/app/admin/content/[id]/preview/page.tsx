import { notFound, redirect } from "next/navigation";
import { ContentBlockRenderer } from "@/components/store/content-block-renderer";
import { getAdminAccess } from "@/lib/admin-permissions";
import { mapPageContent } from "@/lib/content-cms";
import { prisma } from "@/lib/prisma";

export default async function AdminContentPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const access = await getAdminAccess();
  const { id } = await params;
  if (!access) redirect(`/admin-login?callbackUrl=/admin/content/${id}/preview`);
  const row = await prisma.pageContent.findUnique({ where: { id } });
  if (!row) notFound();
  const page = mapPageContent(row);
  return <main className="mx-auto max-w-360 px-4 py-8 sm:px-6 lg:px-8"><div className="mb-8 border border-[var(--accent)] bg-[var(--surface)] p-3 text-center text-xs font-semibold uppercase tracking-[0.12em]">Preview · {page.status} · not public</div><ContentBlockRenderer blocks={page.blocks} /></main>;
}
