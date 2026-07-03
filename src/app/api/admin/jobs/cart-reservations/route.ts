import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiPermission } from "@/lib/admin-api";
import { recordAdminActivity } from "@/lib/admin-activity";
import { expireStaleCartReservations } from "@/lib/cart-reservations";

function hasJobSecret(request: NextRequest) {
  const secret = process.env.ADMIN_JOB_SECRET;
  if (!secret) return false;
  const authorization = request.headers.get("authorization");
  return authorization === `Bearer ${secret}`;
}

export async function POST(request: NextRequest) {
  let actor = "Scheduled job";

  if (!hasJobSecret(request)) {
    const auth = await requireAdminApiPermission("inventory:write");
    if ("response" in auth) return auth.response;
    actor = auth.access.name;
  }

  const expiredCarts = await expireStaleCartReservations();
  await recordAdminActivity({
    actor,
    action: `Expired ${expiredCarts} stale cart reservation${expiredCarts === 1 ? "" : "s"}`,
    entityType: "cart_reservation",
    metadata: { expiredCarts },
  });

  return NextResponse.json({
    expiredCarts,
    ranAt: new Date().toISOString(),
  });
}
