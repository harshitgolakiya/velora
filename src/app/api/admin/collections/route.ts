import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { CollectionStatus } from "@prisma/client";
import { z } from "zod";
import { recordAdminActivity } from "@/lib/admin-activity";
import { requireAdminApiPermission } from "@/lib/admin-api";
import { mapAdminCollection } from "@/lib/admin-catalog";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";

const collectionSchema = z.object({
  name: z.string().min(2),
  slug: z.string().optional(),
  summary: z.string().min(1),
  status: z.enum(["DRAFT", "SCHEDULED", "PUBLISHED"]).default("PUBLISHED"),
  scheduledAt: z.string().trim().optional().nullable(),
  bannerImage: z.string().optional().nullable(),
  seoTitle: z.string().optional().nullable(),
  seoDescription: z.string().optional().nullable(),
  socialImage: z.string().optional().nullable(),
  filterSettings: z.object({
    hiddenGroups: z.array(z.string()).default([]),
    groupOrder: z.array(z.string()).default([]),
  }).optional(),
  productIds: z.array(z.string()).default([]),
  productAssignments: z.array(z.object({
    productId: z.string().min(1),
    sortOrder: z.number().int().default(0),
    pinned: z.boolean().default(false),
  })).default([]),
});

async function ensureUniqueSlug(value: string) {
  const base = slugify(value);
  let slug = base;
  let suffix = 2;

  while (await prisma.collection.findUnique({ where: { slug } })) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }

  return slug;
}

function resolveScheduledAt(status: string, scheduledAt?: string | null) {
  if (status !== "SCHEDULED") return { scheduledAt: null as Date | null };
  if (!scheduledAt) return { error: "Choose a publish date before scheduling this collection." };
  const date = new Date(scheduledAt);
  if (Number.isNaN(date.getTime())) return { error: "Choose a valid publish date before scheduling this collection." };
  return { scheduledAt: date };
}

function normalizeProductAssignments(
  productIds: string[],
  assignments: Array<{ productId: string; sortOrder: number; pinned: boolean }>,
) {
  const explicit = new Map(assignments.map((assignment) => [assignment.productId, assignment]));
  return Array.from(new Set(productIds)).map((productId, index) => {
    const assignment = explicit.get(productId);
    return {
      productId,
      sortOrder: assignment?.sortOrder ?? index,
      pinned: assignment?.pinned ?? false,
    };
  });
}

export async function POST(request: Request) {
  const auth = await requireAdminApiPermission("catalog:write");
  if ("response" in auth) return auth.response;

  const parsed = collectionSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid collection payload", errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const slug = await ensureUniqueSlug(data.slug || data.name);
  const schedule = resolveScheduledAt(data.status, data.scheduledAt);
  if ("error" in schedule) {
    return NextResponse.json({ message: schedule.error }, { status: 400 });
  }
  const productAssignments = normalizeProductAssignments(data.productIds, data.productAssignments);

  try {
    const collection = await prisma.$transaction(async (tx) => {
      const created = await tx.collection.create({
        data: {
          name: data.name.trim(),
          slug,
          summary: data.summary.trim(),
          status: data.status as CollectionStatus,
          scheduledAt: schedule.scheduledAt,
          publishedAt: data.status === "PUBLISHED" ? new Date() : null,
          bannerImage: data.bannerImage?.trim() || null,
          seoTitle: data.seoTitle?.trim() || null,
          seoDescription: data.seoDescription?.trim() || null,
          socialImage: data.socialImage?.trim() || data.bannerImage?.trim() || null,
          filterSettings: JSON.stringify(data.filterSettings ?? {}),
          products: productAssignments.length
            ? { connect: productAssignments.map((assignment) => ({ id: assignment.productId })) }
            : undefined,
        },
      });

      if (productAssignments.length) {
        await tx.collectionProductSetting.createMany({
          data: productAssignments.map((assignment) => ({
            collectionId: created.id,
            productId: assignment.productId,
            sortOrder: assignment.sortOrder,
            pinned: assignment.pinned,
          })),
        });
      }

      return tx.collection.findUniqueOrThrow({
        where: { id: created.id },
        include: {
          products: { select: { id: true } },
          productSettings: { orderBy: [{ pinned: "desc" }, { sortOrder: "asc" }] },
          _count: { select: { products: true } },
        },
      });
    });

    await recordAdminActivity({
      action: `Created collection ${collection.name}`,
      entityType: "collection",
      entityId: collection.id,
      actor: auth.access.name,
      metadata: { slug: collection.slug, productCount: collection._count.products, status: collection.status, scheduledAt: collection.scheduledAt?.toISOString() },
    });
    revalidatePath("/");
    revalidatePath("/shop");
    revalidatePath(`/collections/${collection.slug}`);

    return NextResponse.json({ collection: mapAdminCollection(collection) }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create collection";
    return NextResponse.json({ message }, { status: 500 });
  }
}
