import { NextResponse } from "next/server";
import { z } from "zod";
import { recordAdminActivity } from "@/lib/admin-activity";
import { requireAdminApiPermission } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";

const entitySchema = z.enum(["product", "category", "collection", "homepageSection"]);

const baseSchema = z.object({
  entity: entitySchema,
  ownerId: z.string().min(1),
  locale: z.string().trim().min(2).max(8).default("ar"),
});

const payloadSchema = baseSchema.and(
  z.object({
    title: z.string().trim().optional(),
    name: z.string().trim().optional(),
    description: z.string().trim().optional(),
    summary: z.string().trim().optional(),
    fabricDetails: z.string().trim().optional(),
    careInstructions: z.string().trim().optional(),
    subtitle: z.string().trim().optional(),
    body: z.string().trim().optional(),
    ctaLabel: z.string().trim().optional(),
    ctaHref: z.string().trim().optional(),
    seoTitle: z.string().trim().optional(),
    seoDescription: z.string().trim().optional(),
  }),
);

function permissionForEntity(entity: z.infer<typeof entitySchema>) {
  return entity === "homepageSection" ? "marketing:write" : "catalog:write";
}

function compact(value?: string) {
  return value?.trim() || null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = baseSchema.safeParse({
    entity: searchParams.get("entity"),
    ownerId: searchParams.get("ownerId"),
    locale: searchParams.get("locale") ?? "ar",
  });

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid translation lookup", errors: parsed.error.flatten() }, { status: 400 });
  }

  const auth = await requireAdminApiPermission(permissionForEntity(parsed.data.entity));
  if ("response" in auth) return auth.response;

  const { entity, ownerId, locale } = parsed.data;
  const translation =
    entity === "product"
      ? await prisma.productTranslation.findUnique({ where: { productId_locale: { productId: ownerId, locale } } })
      : entity === "category"
        ? await prisma.categoryTranslation.findUnique({ where: { categoryId_locale: { categoryId: ownerId, locale } } })
        : entity === "collection"
          ? await prisma.collectionTranslation.findUnique({ where: { collectionId_locale: { collectionId: ownerId, locale } } })
          : await prisma.homepageSectionTranslation.findUnique({ where: { homepageSectionId_locale: { homepageSectionId: ownerId, locale } } });

  return NextResponse.json({ translation });
}

export async function PATCH(request: Request) {
  const parsed = payloadSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid translation payload", errors: parsed.error.flatten() }, { status: 400 });
  }

  const auth = await requireAdminApiPermission(permissionForEntity(parsed.data.entity));
  if ("response" in auth) return auth.response;

  const { entity, ownerId, locale } = parsed.data;

  try {
    const translation =
      entity === "product"
        ? await prisma.productTranslation.upsert({
            where: { productId_locale: { productId: ownerId, locale } },
            create: {
              productId: ownerId,
              locale,
              title: parsed.data.title ?? "",
              description: parsed.data.description ?? "",
              fabricDetails: compact(parsed.data.fabricDetails),
              careInstructions: compact(parsed.data.careInstructions),
              seoTitle: compact(parsed.data.seoTitle),
              seoDescription: compact(parsed.data.seoDescription),
            },
            update: {
              title: parsed.data.title ?? "",
              description: parsed.data.description ?? "",
              fabricDetails: compact(parsed.data.fabricDetails),
              careInstructions: compact(parsed.data.careInstructions),
              seoTitle: compact(parsed.data.seoTitle),
              seoDescription: compact(parsed.data.seoDescription),
            },
          })
        : entity === "category"
          ? await prisma.categoryTranslation.upsert({
              where: { categoryId_locale: { categoryId: ownerId, locale } },
              create: {
                categoryId: ownerId,
                locale,
                name: parsed.data.name ?? "",
                description: compact(parsed.data.description),
                seoTitle: compact(parsed.data.seoTitle),
                seoDescription: compact(parsed.data.seoDescription),
              },
              update: {
                name: parsed.data.name ?? "",
                description: compact(parsed.data.description),
                seoTitle: compact(parsed.data.seoTitle),
                seoDescription: compact(parsed.data.seoDescription),
              },
            })
          : entity === "collection"
            ? await prisma.collectionTranslation.upsert({
                where: { collectionId_locale: { collectionId: ownerId, locale } },
                create: {
                  collectionId: ownerId,
                  locale,
                  name: parsed.data.name ?? "",
                  summary: parsed.data.summary ?? "",
                  seoTitle: compact(parsed.data.seoTitle),
                  seoDescription: compact(parsed.data.seoDescription),
                },
                update: {
                  name: parsed.data.name ?? "",
                  summary: parsed.data.summary ?? "",
                  seoTitle: compact(parsed.data.seoTitle),
                  seoDescription: compact(parsed.data.seoDescription),
                },
              })
            : await prisma.homepageSectionTranslation.upsert({
                where: { homepageSectionId_locale: { homepageSectionId: ownerId, locale } },
                create: {
                  homepageSectionId: ownerId,
                  locale,
                  title: parsed.data.title ?? "",
                  subtitle: compact(parsed.data.subtitle),
                  body: compact(parsed.data.body),
                  ctaLabel: compact(parsed.data.ctaLabel),
                  ctaHref: compact(parsed.data.ctaHref),
                },
                update: {
                  title: parsed.data.title ?? "",
                  subtitle: compact(parsed.data.subtitle),
                  body: compact(parsed.data.body),
                  ctaLabel: compact(parsed.data.ctaLabel),
                  ctaHref: compact(parsed.data.ctaHref),
                },
              });

    await recordAdminActivity({
      action: `Updated ${locale} ${entity} translation`,
      entityType: `${entity}_translation`,
      entityId: ownerId,
      actor: auth.access.name,
      metadata: { entity, ownerId, locale },
    });

    return NextResponse.json({ translation });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save translation";
    if (message.includes("Foreign key constraint")) return NextResponse.json({ message: "Translation owner not found" }, { status: 404 });
    return NextResponse.json({ message }, { status: 500 });
  }
}
