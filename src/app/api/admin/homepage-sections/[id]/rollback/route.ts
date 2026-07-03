import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { recordAdminActivity } from "@/lib/admin-activity";
import { requireAdminApiPermission } from "@/lib/admin-api";
import { mapAdminHomepageSection } from "@/lib/admin-catalog";
import { createHomepageSectionVersion } from "@/lib/homepage-section-versions";
import { prisma } from "@/lib/prisma";

function parseVersionProductIds(value: string) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApiPermission("marketing:write");
  if ("response" in auth) return auth.response;

  const parsed = z.object({ versionId: z.string().min(1) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Choose a version" }, { status: 400 });

  const { id } = await params;
  const [section, version] = await Promise.all([
    prisma.homepageSection.findUnique({ where: { id } }),
    prisma.homepageSectionVersion.findFirst({ where: { id: parsed.data.versionId, homepageSectionId: id } }),
  ]);

  if (!section || !version) {
    return NextResponse.json({ message: "Version not found" }, { status: 404 });
  }

  await createHomepageSectionVersion(id, auth.access.email);

  const restored = await prisma.homepageSection.update({
    where: { id },
    data: {
      key: version.key,
      type: version.type,
      status: "DRAFT",
      title: version.title,
      subtitle: version.subtitle,
      body: version.body,
      ctaLabel: version.ctaLabel,
      ctaHref: version.ctaHref,
      imageUrl: version.imageUrl,
      mobileImageUrl: version.mobileImageUrl,
      sortOrder: version.sortOrder,
      enabled: version.enabled,
      settings: version.settings,
      collectionId: version.collectionId,
      scheduledAt: null,
      publishedAt: null,
      products: { set: parseVersionProductIds(version.productIds).map((productId) => ({ id: productId })) },
    },
    include: {
      collection: { select: { name: true } },
      products: { select: { id: true } },
      versions: { orderBy: { version: "desc" }, take: 10 },
    },
  });

  await recordAdminActivity({
    actor: auth.access.email,
    action: "homepage_section.rolled_back",
    entityType: "homepage_section",
    entityId: id,
    metadata: { version: version.version, title: section.title },
  });
  revalidatePath("/");

  return NextResponse.json({ section: mapAdminHomepageSection(restored) });
}
