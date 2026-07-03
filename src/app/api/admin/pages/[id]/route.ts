import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { recordAdminActivity } from "@/lib/admin-activity";
import { requireAdminApiPermission } from "@/lib/admin-api";
import { createPageVersion, mapPageContent, pageContentInputSchema } from "@/lib/content-cms";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApiPermission("admin:read");
  if ("response" in auth) return auth.response;
  const { id } = await params;
  const page = await prisma.pageContent.findUnique({ where: { id }, include: { versions: { orderBy: { version: "desc" }, take: 30 } } });
  if (!page) return NextResponse.json({ message: "Page not found" }, { status: 404 });
  return NextResponse.json({ page: mapPageContent(page) });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApiPermission("catalog:write");
  if ("response" in auth) return auth.response;
  const parsed = pageContentInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Check page content", errors: parsed.error.flatten() }, { status: 400 });
  const { id } = await params;
  const existing = await prisma.pageContent.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ message: "Page not found" }, { status: 404 });
  await createPageVersion(id, auth.access.email);
  const data = parsed.data;
  const page = await prisma.pageContent.update({
    where: { id },
    data: {
      ...data,
      summary: data.summary || null,
      blocks: JSON.stringify(data.blocks),
      scheduledAt: data.status === "SCHEDULED" ? new Date(data.scheduledAt!) : null,
      publishedAt: data.status === "PUBLISHED" ? existing.publishedAt ?? new Date() : null,
    },
  });
  await recordAdminActivity({ actor: auth.access.email, action: "page_content.updated", entityType: "PageContent", entityId: page.id, metadata: { slug: page.slug, status: page.status } });
  revalidatePath(`/${existing.slug}`);
  if (existing.slug !== page.slug) revalidatePath(`/${page.slug}`);
  return NextResponse.json({ page: mapPageContent(page) });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApiPermission("catalog:write");
  if ("response" in auth) return auth.response;
  const { id } = await params;
  const page = await prisma.pageContent.findUnique({ where: { id } });
  if (!page) return NextResponse.json({ message: "Page not found" }, { status: 404 });
  if (page.status === "PUBLISHED") return NextResponse.json({ message: "Move the page to draft before deleting it" }, { status: 409 });
  await prisma.pageContent.delete({ where: { id } });
  await recordAdminActivity({ actor: auth.access.email, action: "page_content.deleted", entityType: "PageContent", entityId: id, metadata: { slug: page.slug } });
  revalidatePath(`/${page.slug}`);
  return NextResponse.json({ deleted: true });
}
