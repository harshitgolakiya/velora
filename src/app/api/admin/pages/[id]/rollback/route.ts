import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { recordAdminActivity } from "@/lib/admin-activity";
import { requireAdminApiPermission } from "@/lib/admin-api";
import { createPageVersion, mapPageContent } from "@/lib/content-cms";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApiPermission("catalog:write");
  if ("response" in auth) return auth.response;
  const parsed = z.object({ versionId: z.string().min(1) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Choose a version" }, { status: 400 });
  const { id } = await params;
  const [page, version] = await Promise.all([
    prisma.pageContent.findUnique({ where: { id } }),
    prisma.pageContentVersion.findFirst({ where: { id: parsed.data.versionId, pageId: id } }),
  ]);
  if (!page || !version) return NextResponse.json({ message: "Version not found" }, { status: 404 });
  await createPageVersion(id, auth.access.email);
  const restored = await prisma.pageContent.update({
    where: { id },
    data: {
      title: version.title,
      summary: version.summary,
      body: version.body,
      blocks: version.blocks,
      contentType: version.contentType,
      status: "DRAFT",
      seoTitle: version.seoTitle,
      seoDescription: version.seoDescription,
      socialImage: version.socialImage,
      scheduledAt: null,
      publishedAt: null,
    },
  });
  await recordAdminActivity({ actor: auth.access.email, action: "page_content.rolled_back", entityType: "PageContent", entityId: id, metadata: { version: version.version } });
  revalidatePath(`/${page.slug}`);
  return NextResponse.json({ page: mapPageContent(restored) });
}
