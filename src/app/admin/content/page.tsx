import { redirect } from "next/navigation";
import { ContentManager } from "@/components/admin/content-manager";
import { getAdminAccess } from "@/lib/admin-permissions";
import { prisma } from "@/lib/prisma";

export default async function AdminContentPage() {
  const access = await getAdminAccess();
  if (!access) redirect("/admin-login?callbackUrl=/admin/content");
  const pages = await prisma.pageContent.findMany({
    orderBy: [{ contentType: "asc" }, { title: "asc" }],
    include: { _count: { select: { versions: true } } },
  });
  return <ContentManager pages={pages.map((page) => ({
    id: page.id,
    slug: page.slug,
    title: page.title,
    contentType: page.contentType,
    status: page.status,
    updatedAt: page.updatedAt.toISOString(),
    versionCount: page._count.versions,
  }))} />;
}
