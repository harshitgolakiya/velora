import { NextResponse } from "next/server";
import { recordAdminActivity } from "@/lib/admin-activity";
import { requireAdminApiPermission } from "@/lib/admin-api";
import { mapPageContent, pageContentInputSchema } from "@/lib/content-cms";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await requireAdminApiPermission("admin:read");
  if ("response" in auth) return auth.response;
  const pages = await prisma.pageContent.findMany({ orderBy: [{ contentType: "asc" }, { title: "asc" }], include: { _count: { select: { versions: true } } } });
  return NextResponse.json({ pages: pages.map(mapPageContent) });
}

export async function POST(request: Request) {
  const auth = await requireAdminApiPermission("catalog:write");
  if ("response" in auth) return auth.response;
  const parsed = pageContentInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Check page content", errors: parsed.error.flatten() }, { status: 400 });
  const data = parsed.data;
  try {
    const page = await prisma.pageContent.create({
      data: {
        ...data,
        summary: data.summary || null,
        blocks: JSON.stringify(data.blocks),
        scheduledAt: data.status === "SCHEDULED" ? new Date(data.scheduledAt!) : null,
        publishedAt: data.status === "PUBLISHED" ? new Date() : null,
      },
    });
    await recordAdminActivity({ actor: auth.access.email, action: "page_content.created", entityType: "PageContent", entityId: page.id, metadata: { slug: page.slug, status: page.status } });
    return NextResponse.json({ page: mapPageContent(page) }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error && error.message.includes("Unique") ? "A page with this slug already exists" : "Unable to create page" }, { status: 409 });
  }
}
