import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { requireAdminApiPermission } from "@/lib/admin-api";
import { recordAdminActivity } from "@/lib/admin-activity";
import { prisma } from "@/lib/prisma";
import {
  getRecommendationSettings,
  recommendationSettingsSchema,
  updateRecommendationSettings,
} from "@/lib/store-settings";

export async function GET() {
  const auth = await requireAdminApiPermission("admin:read");
  if ("response" in auth) return auth.response;
  return NextResponse.json({ settings: await getRecommendationSettings() });
}

export async function PUT(request: Request) {
  const auth = await requireAdminApiPermission("catalog:write");
  if ("response" in auth) return auth.response;
  const parsed = recommendationSettingsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ message: "Check recommendation settings", errors: parsed.error.flatten() }, { status: 400 });
  }

  const productIds = Array.from(new Set(
    Object.entries(parsed.data.manualOverrides).flatMap(([sourceId, recommendedIds]) => [sourceId, ...recommendedIds]),
  ));
  const existingIds = productIds.length
    ? new Set((await prisma.product.findMany({
        where: { id: { in: productIds }, status: "PUBLISHED" },
        select: { id: true },
      })).map((product) => product.id))
    : new Set<string>();
  const manualOverrides = Object.fromEntries(
    Object.entries(parsed.data.manualOverrides)
      .filter(([sourceId]) => existingIds.has(sourceId))
      .map(([sourceId, recommendedIds]) => [
        sourceId,
        Array.from(new Set(recommendedIds.filter((id) => id !== sourceId && existingIds.has(id)))).slice(0, parsed.data.maxItems),
      ])
      .filter(([, recommendedIds]) => recommendedIds.length > 0),
  );
  const settings = await updateRecommendationSettings({ ...parsed.data, manualOverrides });

  await recordAdminActivity({
    actor: auth.access.email,
    action: "recommendation_settings.updated",
    entityType: "StoreSetting",
    entityId: "recommendations",
    metadata: {
      strategy: settings.strategy,
      enabled: settings.enabled,
      overrideCount: Object.keys(settings.manualOverrides).length,
    },
  });
  revalidatePath("/product/[slug]", "page");
  return NextResponse.json({ settings });
}
