import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdminApiPermission } from "@/lib/admin-api";
import { recordAdminActivity } from "@/lib/admin-activity";
import { globalContentSchema } from "@/lib/global-content";
import {
  getGlobalContentSettings,
  publishGlobalContent,
  updateGlobalContentDraft,
} from "@/lib/global-content-store";

export async function GET() {
  const auth = await requireAdminApiPermission("admin:read");
  if ("response" in auth) return auth.response;

  return NextResponse.json({ settings: await getGlobalContentSettings() });
}

export async function PUT(request: Request) {
  const auth = await requireAdminApiPermission("catalog:write");
  if ("response" in auth) return auth.response;

  const body = await request.json();
  const action = body?.action === "publish" ? "publish" : "draft";
  const parsed = globalContentSchema.safeParse(body?.content);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Check global storefront content", errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const settings = action === "publish"
    ? await publishGlobalContent(parsed.data)
    : await updateGlobalContentDraft(parsed.data);

  await recordAdminActivity({
    actor: auth.access.email,
    action: action === "publish" ? "global_content.published" : "global_content.draft_saved",
    entityType: "StoreSetting",
    entityId: "globalContent",
    metadata: {
      announcementCount: parsed.data.announcements.filter((item) => item.enabled).length,
      primaryNavigationCount: parsed.data.primaryNavigation.filter((item) => item.enabled).length,
      footerGroupCount: parsed.data.footerGroups.filter((item) => item.enabled).length,
      publishedAt: settings.publishedAt,
    },
  });

  revalidatePath("/", "layout");
  return NextResponse.json({ settings });
}
