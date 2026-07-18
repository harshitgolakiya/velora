import { NextResponse } from "next/server";
import { requireAdminApiPermission } from "@/lib/admin-api";
import { getBusinessHealth } from "@/lib/business-health";
import { notifyMonitoring } from "@/lib/observability";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdminApiPermission("analytics:read");
  if ("response" in auth) return auth.response;

  const health = await getBusinessHealth();
  if (health.status !== "ok") {
    await notifyMonitoring({
      severity: health.status === "action_required" ? "error" : "warn",
      title: `Velora business health ${health.status}`,
      context: { metrics: health.metrics, issues: health.issues },
    });
  }

  return NextResponse.json(health, {
    status: health.status === "action_required" ? 503 : 200,
    headers: { "Cache-Control": "no-store" },
  });
}
