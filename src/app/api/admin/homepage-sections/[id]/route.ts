import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { HomepageSectionStatus, HomepageSectionType } from "@prisma/client";
import { z } from "zod";
import { recordAdminActivity } from "@/lib/admin-activity";
import { requireAdminApiPermission } from "@/lib/admin-api";
import { mapAdminHomepageSection } from "@/lib/admin-catalog";
import { createHomepageSectionVersion } from "@/lib/homepage-section-versions";
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
  key: z.string().trim().min(2),
  type: z.enum(sectionTypes),
  status: z.enum(["DRAFT", "SCHEDULED", "PUBLISHED"]),
  title: z.string().trim().min(2),
  subtitle: z.string().trim().optional(),
  body: z.string().trim().optional(),
  ctaLabel: z.string().trim().optional(),
  ctaHref: z.string().trim().optional(),
  imageUrl: z.string().trim().optional(),
  mobileImageUrl: z.string().trim().optional(),
  enabled: z.boolean(),
  settings: z.record(z.string(), z.unknown()).default({}),
  scheduledAt: z.string().trim().optional().nullable(),
  collectionId: z.string().optional().nullable(),
  productIds: z.array(z.string()).default([]),
});

function resolveScheduledAt(status: string, scheduledAt?: string | null) {
  if (status !== "SCHEDULED") return { scheduledAt: null as Date | null };
  if (!scheduledAt) return { error: "Choose a publish date before scheduling this section." };
  const date = new Date(scheduledAt);
  if (Number.isNaN(date.getTime())) return { error: "Choose a valid publish date before scheduling this section." };
  return { scheduledAt: date };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApiPermission("marketing:write");
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const section = await prisma.homepageSection.findUnique({
    where: { id },
    include: {
      collection: { select: { name: true } },
      products: { select: { id: true } },
      versions: { orderBy: { version: "desc" }, take: 30 },
    },
  });

  if (!section) {
    return NextResponse.json({ message: "Homepage section not found" }, { status: 404 });
  }

  return NextResponse.json({ section: mapAdminHomepageSection(section) });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApiPermission("marketing:write");
  if ("response" in auth) return auth.response;

  const { id } = await params;
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

  const current = await prisma.homepageSection.findUnique({
    where: { id },
    select: { status: true, publishedAt: true },
  });

  if (!current) {
    return NextResponse.json({ message: "Homepage section not found" }, { status: 404 });
  }

  try {
    await createHomepageSectionVersion(id, auth.access.email);
    const section = await prisma.homepageSection.update({
      where: { id },
      data: {
        key: data.key,
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
        publishedAt:
          data.status === "PUBLISHED" && current.status !== "PUBLISHED"
            ? new Date()
            : data.status === "PUBLISHED"
            ? current.publishedAt ?? new Date()
            : null,
        collectionId: data.collectionId || null,
        products: { set: data.productIds.map((productId) => ({ id: productId })) },
      },
      include: {
        collection: { select: { name: true } },
        products: { select: { id: true } },
        versions: { orderBy: { version: "desc" }, take: 10 },
      },
    });

    await recordAdminActivity({
      action: `Updated homepage section ${section.title}`,
      entityType: "homepage_section",
      entityId: section.id,
      actor: auth.access.name,
      metadata: { key: section.key, type: section.type, status: section.status, enabled: section.enabled, scheduledAt: section.scheduledAt?.toISOString() },
    });
    revalidatePath("/");

    return NextResponse.json({ section: mapAdminHomepageSection(section) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update homepage section";
    if (message.includes("Record to update not found")) {
      return NextResponse.json({ message: "Homepage section not found" }, { status: 404 });
    }
    if (message.includes("Unique constraint")) {
      return NextResponse.json({ message: "A homepage section with this key already exists" }, { status: 409 });
    }
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApiPermission("marketing:write");
  if ("response" in auth) return auth.response;

  const { id } = await params;

  try {
    const section = await prisma.homepageSection.delete({ where: { id } });

    await recordAdminActivity({
      action: `Deleted homepage section ${section.title}`,
      entityType: "homepage_section",
      entityId: section.id,
      actor: auth.access.name,
      metadata: { key: section.key, type: section.type },
    });
    revalidatePath("/");

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete homepage section";
    if (message.includes("Record to delete does not exist")) {
      return NextResponse.json({ message: "Homepage section not found" }, { status: 404 });
    }
    return NextResponse.json({ message }, { status: 500 });
  }
}
