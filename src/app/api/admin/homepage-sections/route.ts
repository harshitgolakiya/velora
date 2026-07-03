import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { HomepageSectionStatus, HomepageSectionType } from "@prisma/client";
import { z } from "zod";
import { recordAdminActivity } from "@/lib/admin-activity";
import { requireAdminApiPermission } from "@/lib/admin-api";
import { mapAdminHomepageSection } from "@/lib/admin-catalog";
import { getHomepagePublicationError } from "@/lib/homepage-section-validation";
import { prisma } from "@/lib/prisma";

const sectionTypes = [
  "HERO",
  "FEATURED_PRODUCTS",
  "COLLECTION_STORY",
  "PRODUCT_GRID",
  "STORY_BAND",
  "NEWSLETTER",
  "CUSTOM",
] as const;

const homepageSectionSchema = z.object({
  key: z.string().trim().min(2).optional(),
  type: z.enum(sectionTypes),
  status: z.enum(["DRAFT", "SCHEDULED", "PUBLISHED"]).default("DRAFT"),
  title: z.string().trim().min(2),
  subtitle: z.string().trim().optional(),
  body: z.string().trim().optional(),
  ctaLabel: z.string().trim().optional(),
  ctaHref: z.string().trim().optional(),
  imageUrl: z.string().trim().optional(),
  mobileImageUrl: z.string().trim().optional(),
  enabled: z.boolean().default(true),
  settings: z.record(z.string(), z.unknown()).default({}),
  scheduledAt: z.string().trim().optional().nullable(),
  collectionId: z.string().optional().nullable(),
  productIds: z.array(z.string()).default([]),
});

function keyFromTitle(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

function resolveScheduledAt(status: string, scheduledAt?: string | null) {
  if (status !== "SCHEDULED") return { scheduledAt: null as Date | null };
  if (!scheduledAt) return { error: "Choose a publish date before scheduling this section." };
  const date = new Date(scheduledAt);
  if (Number.isNaN(date.getTime())) return { error: "Choose a valid publish date before scheduling this section." };
  return { scheduledAt: date };
}

export async function POST(request: Request) {
  const auth = await requireAdminApiPermission("marketing:write");
  if ("response" in auth) return auth.response;

  const parsed = homepageSectionSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid homepage section payload", errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const publicationError = getHomepagePublicationError(data);
  if (publicationError) {
    return NextResponse.json({ message: publicationError }, { status: 400 });
  }
  const schedule = resolveScheduledAt(data.status, data.scheduledAt);
  if ("error" in schedule) {
    return NextResponse.json({ message: schedule.error }, { status: 400 });
  }

  const sortOrder = await prisma.homepageSection.count();

  try {
    const section = await prisma.homepageSection.create({
      data: {
        key: data.key || keyFromTitle(data.title),
        type: data.type as HomepageSectionType,
        status: data.status as HomepageSectionStatus,
        title: data.title,
        subtitle: data.subtitle || null,
        body: data.body || null,
        ctaLabel: data.ctaLabel || null,
        ctaHref: data.ctaHref || null,
        imageUrl: data.imageUrl || null,
        mobileImageUrl: data.mobileImageUrl || null,
        enabled: data.enabled,
        settings: JSON.stringify(data.settings ?? {}),
        scheduledAt: schedule.scheduledAt,
        publishedAt: data.status === "PUBLISHED" ? new Date() : null,
        sortOrder,
        collectionId: data.collectionId || null,
        products: { connect: data.productIds.map((id) => ({ id })) },
      },
      include: {
        collection: { select: { name: true } },
        products: { select: { id: true } },
        versions: { orderBy: { version: "desc" }, take: 10 },
      },
    });

    await recordAdminActivity({
      action: `Created homepage section ${section.title}`,
      entityType: "homepage_section",
      entityId: section.id,
      actor: auth.access.name,
      metadata: { key: section.key, type: section.type, status: section.status, scheduledAt: section.scheduledAt?.toISOString() },
    });
    revalidatePath("/");

    return NextResponse.json({ section: mapAdminHomepageSection(section) }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create homepage section";
    if (message.includes("Unique constraint")) {
      return NextResponse.json({ message: "A homepage section with this key already exists" }, { status: 409 });
    }
    return NextResponse.json({ message }, { status: 500 });
  }
}
