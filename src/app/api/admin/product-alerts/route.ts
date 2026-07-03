import { NextResponse } from "next/server";
import { z } from "zod";
import { recordAdminActivity } from "@/lib/admin-activity";
import { requireAdminApiPermission } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import { getProductAlertQueueRows, processProductAlertQueue } from "@/lib/product-alert-queue";

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("run") }),
  z.object({ action: z.literal("retry"), deliveryId: z.string().trim().min(1) }),
]);

export async function GET() {
  const auth = await requireAdminApiPermission("marketing:write");
  if ("response" in auth) return auth.response;
  return NextResponse.json({ deliveries: await getProductAlertQueueRows() });
}

export async function POST(request: Request) {
  const auth = await requireAdminApiPermission("marketing:write");
  if ("response" in auth) return auth.response;
  const parsed = actionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Invalid product alert action" }, { status: 400 });

  if (parsed.data.action === "retry") {
    const reset = await prisma.productAlertDelivery.updateMany({
      where: { id: parsed.data.deliveryId, status: { in: ["FAILED", "EXHAUSTED"] } },
      data: { status: "QUEUED", attempts: 0, nextAttemptAt: new Date(), error: null },
    });
    if (!reset.count) return NextResponse.json({ message: "This alert cannot be retried" }, { status: 409 });
  }

  const result = await processProductAlertQueue();
  await recordAdminActivity({
    actor: auth.access.email,
    action: parsed.data.action === "retry" ? "product_alert.retry" : "product_alert_queue.run",
    entityType: "ProductAlertDelivery",
    entityId: parsed.data.action === "retry" ? parsed.data.deliveryId : undefined,
    metadata: result,
  });
  return NextResponse.json({ ...result, deliveries: await getProductAlertQueueRows() });
}
