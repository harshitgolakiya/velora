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

async function ensureUniqueSlug(value: string) {
  const base = slugify(value);
  let slug = base;
  let suffix = 2;

  while (await prisma.category.findUnique({ where: { slug } })) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }

  return slug;
}

export async function POST(request: Request) {
  const auth = await requireAdminApiPermission("catalog:write");
  if ("response" in auth) return auth.response;

  const parsed = categorySchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid category payload", errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const slug = await ensureUniqueSlug(data.slug || data.name);

  try {
    const category = await prisma.category.create({
      data: {
        name: data.name.trim(),
        slug,
        parentId: data.parentId || null,
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
      action: `Created category ${category.name}`,
      entityType: "category",
      entityId: category.id,
      actor: auth.access.name,
      metadata: { slug: category.slug, parentId: category.parentId },
    });
    revalidatePath("/shop");

    return NextResponse.json({ category: mapAdminCategory(category) }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create category";
    return NextResponse.json({ message }, { status: 500 });
  }
}
