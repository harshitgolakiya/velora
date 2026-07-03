import { NextResponse } from "next/server";
import { OrderStatus } from "@prisma/client";
import { z } from "zod";
import { recordAdminActivity } from "@/lib/admin-activity";
import { requireAdminApiPermission } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";

const bulkUpdateSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(200),
  status: z.enum(["PENDING", "PAID", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"]),
  paymentStatus: z.string().min(1),
  fulfillmentStatus: z.string().min(1),
});

export async function PATCH(request: Request) {
  const auth = await requireAdminApiPermission("orders:write");
  if ("response" in auth) return auth.response;

  const parsed = bulkUpdateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid bulk order payload", errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { ids, status, paymentStatus, fulfillmentStatus } = parsed.data;
  const existing = await prisma.order.findMany({
    where: { id: { in: ids } },
    select: { id: true, orderNumber: true },
  });

  if (!existing.length) {
    return NextResponse.json({ message: "No matching orders found" }, { status: 404 });
  }

  await prisma.$transaction([
    prisma.order.updateMany({
      where: { id: { in: existing.map((order) => order.id) } },
      data: {
        status: status as OrderStatus,
        paymentStatus,
        fulfillmentStatus,
      },
    }),
    prisma.payment.updateMany({
      where: { orderId: { in: existing.map((order) => order.id) } },
      data: { status: paymentStatus },
    }),
    prisma.shipment.updateMany({
      where: { orderId: { in: existing.map((order) => order.id) } },
      data: { status: fulfillmentStatus },
    }),
  ]);

  await recordAdminActivity({
    action: `Bulk updated ${existing.length} orders`,
    entityType: "order",
    actor: auth.access.name,
    metadata: {
      orderIds: existing.map((order) => order.id),
      orderNumbers: existing.map((order) => order.orderNumber),
      status,
      paymentStatus,
      fulfillmentStatus,
    },
  });

  return NextResponse.json({ count: existing.length });
}
