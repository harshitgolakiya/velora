import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { recordAdminActivity } from "@/lib/admin-activity";
import { requireAdminApiPermission } from "@/lib/admin-api";
import { mapAdminCategory } from "@/lib/admin-catalog";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";

const categorySchema = z.object({
  name: z.string().min(2),
  slug: z.string().optional(),
  parentId: z.string().optional().nullable(),
  seoTitle: z.string().optional().nullable(),
  seoDescription: z.string().optional().nullable(),
  socialImage: z.string().optional().nullable(),
  filterSettings: z.object({
    hiddenGroups: z.array(z.string()).default([]),
    groupOrder: z.array(z.string()).default([]),
  }).optional(),
});

async function ensureUniqueSlug(value: string, categoryId: string) {
  const base = slugify(value);
  let slug = base;
  let suffix = 2;

  while (true) {
    const existing = await prisma.category.findUnique({ where: { slug } });
    if (!existing || existing.id === categoryId) return slug;
    slug = `${base}-${suffix}`;
    suffix += 1;
  }
}

async function isDescendant(categoryId: string, possibleDescendantId: string) {
  let next = await prisma.category.findUnique({
    where: { id: possibleDescendantId },
    select: { parentId: true },
  });

  while (next?.parentId) {
    if (next.parentId === categoryId) return true;
    next = await prisma.category.findUnique({
      where: { id: next.parentId },
      select: { parentId: true },
    });
  }

  return false;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApiPermission("catalog:write");
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const parsed = categorySchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid category payload", errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const parentId = data.parentId || null;

  if (parentId === id) {
    return NextResponse.json({ message: "A category cannot be its own parent" }, { status: 400 });
  }

  if (parentId && (await isDescendant(id, parentId))) {
    return NextResponse.json(
      { message: "A category cannot be moved under one of its children" },
      { status: 400 },
    );
  }

  const slug = await ensureUniqueSlug(data.slug || data.name, id);

  try {
    const category = await prisma.category.update({
      where: { id },
      data: {
        name: data.name.trim(),
        slug,
        parentId,
        seoTitle: data.seoTitle?.trim() || null,
        seoDescription: data.seoDescription?.trim() || null,
        socialImage: data.socialImage?.trim() || null,
        filterSettings: JSON.stringify(data.filterSettings ?? {}),
      },
      include: {
        parent: true,
        _count: { select: { products: true, children: true } },
      },
    });

    await recordAdminActivity({
      action: `Updated category ${category.name}`,
      entityType: "category",
      entityId: category.id,
      actor: auth.access.name,
      metadata: { slug: category.slug, parentId: category.parentId },
    });
    revalidatePath("/shop");

    return NextResponse.json({ category: mapAdminCategory(category) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update category";
    const status = message.includes("Record to update not found") ? 404 : 500;
    return NextResponse.json({ message }, { status });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApiPermission("catalog:write");
  if ("response" in auth) return auth.response;

  const { id } = await params;

  const category = await prisma.category.findUnique({
    where: { id },
    include: {
      _count: { select: { products: true, children: true } },
    },
  });

  if (!category) {
    return NextResponse.json({ message: "Category not found" }, { status: 404 });
  }

  if (category._count.products > 0 || category._count.children > 0) {
    return NextResponse.json(
      { message: "Move products and child categories before deleting this category" },
      { status: 409 },
    );
  }

  await prisma.category.delete({ where: { id } });

  await recordAdminActivity({
    action: `Deleted category ${category.name}`,
    entityType: "category",
    entityId: category.id,
    actor: auth.access.name,
    metadata: { slug: category.slug },
  });
  revalidatePath("/shop");

  return NextResponse.json({ ok: true });
}
