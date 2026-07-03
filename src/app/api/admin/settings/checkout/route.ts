import { NextResponse } from "next/server";
import { requireAdminApiPermission } from "@/lib/admin-api";
import { recordAdminActivity } from "@/lib/admin-activity";
import {
  checkoutSettingsSchema,
  getCheckoutSettings,
  updateCheckoutSettings,
} from "@/lib/store-settings";

export async function GET() {
  const auth = await requireAdminApiPermission("admin:read");
  if ("response" in auth) return auth.response;

  return NextResponse.json({ settings: await getCheckoutSettings() });
}

export async function PUT(request: Request) {
  const auth = await requireAdminApiPermission("orders:write");
  if ("response" in auth) return auth.response;

  const parsed = checkoutSettingsSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid checkout settings", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const settings = await updateCheckoutSettings(parsed.data);
  await recordAdminActivity({
    actor: auth.access.email,
    action: "checkout_settings.updated",
    entityType: "StoreSetting",
    entityId: "checkout",
    metadata: {
      cashOnDeliveryEnabled: settings.cashOnDeliveryEnabled,
    },
  });

  return NextResponse.json({ settings });
}
