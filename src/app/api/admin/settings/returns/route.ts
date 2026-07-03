import { NextResponse } from "next/server";
import { recordAdminActivity } from "@/lib/admin-activity";
import { requireAdminApiPermission } from "@/lib/admin-api";
import { getReturnSettings, returnSettingsSchema, updateReturnSettings } from "@/lib/store-settings";

export async function GET() {
  const auth = await requireAdminApiPermission("admin:read");
  if ("response" in auth) return auth.response;
  return NextResponse.json({ settings: await getReturnSettings() });
}

export async function PUT(request: Request) {
  const auth = await requireAdminApiPermission("orders:write");
  if ("response" in auth) return auth.response;
  const parsed = returnSettingsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Check the return policy settings", errors: parsed.error.flatten() }, { status: 400 });
  const settings = await updateReturnSettings(parsed.data);
  await recordAdminActivity({
    actor: auth.access.name,
    action: "Updated return and exchange policy",
    entityType: "StoreSetting",
    entityId: "returns",
    metadata: settings,
  });
  return NextResponse.json({ settings });
}
