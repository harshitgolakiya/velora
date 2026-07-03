import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { recordAdminActivity } from "@/lib/admin-activity";
import { requireAdminApiPermission } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import { searchMerchandisingSettingsSchema } from "@/lib/search-merchandising";
import { getSearchMerchandisingSettings, updateSearchMerchandisingSettings } from "@/lib/search-merchandising-store";

export async function GET() {
  const auth = await requireAdminApiPermission("admin:read");
  if ("response" in auth) return auth.response;
  return NextResponse.json({ settings: await getSearchMerchandisingSettings() });
}

export async function PATCH(request: Request) {
  const auth = await requireAdminApiPermission("catalog:write");
  if ("response" in auth) return auth.response;

  const parsed = searchMerchandisingSettingsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ message: "Check search merchandising settings", errors: parsed.error.flatten() }, { status: 400 });
  }

  const productIds = Array.from(new Set([
    ...Object.values(parsed.data.pinnedProducts).flat(),
    ...Object.values(parsed.data.boostedProducts).flat(),
    ...Object.values(parsed.data.buriedProducts).flat(),
  ]));
  const existingIds = productIds.length
    ? new Set((await prisma.product.findMany({
        where: { id: { in: productIds }, status: "PUBLISHED" },
        select: { id: true },
      })).map((product) => product.id))
    : new Set<string>();
  const filterProductRules = (rules: Record<string, string[]>) =>
    Object.fromEntries(
      Object.entries(rules)
        .map(([query, ids]) => [query, Array.from(new Set(ids.filter((id) => existingIds.has(id))))] as const)
        .filter(([, ids]) => ids.length > 0),
    );

  const settings = await updateSearchMerchandisingSettings({
    ...parsed.data,
    pinnedProducts: filterProductRules(parsed.data.pinnedProducts),
    boostedProducts: filterProductRules(parsed.data.boostedProducts),
    buriedProducts: filterProductRules(parsed.data.buriedProducts),
  });
  await recordAdminActivity({
    action: "search_merchandising.updated",
    entityType: "StoreSetting",
    entityId: "search_merchandising",
    actor: auth.access.name,
    metadata: {
      synonyms: Object.keys(settings.synonyms).length,
      redirects: Object.keys(settings.redirects).length,
      pinnedQueries: Object.keys(settings.pinnedProducts).length,
    },
  });
  revalidatePath("/search");
  return NextResponse.json({ settings });
}
