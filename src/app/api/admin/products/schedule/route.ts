import { NextResponse } from "next/server";
import { ProductStatus } from "@prisma/client";
import { z } from "zod";
import { recordAdminActivity } from "@/lib/admin-activity";
import { requireAdminApiPermission } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  productIds: z.array(z.string().min(1)).min(1),
  scheduledAt: z.string().datetime(),
});

export async function PATCH(request: Request) {
  const auth = await requireAdminApiPermission("catalog:write");
  if ("response" in auth) return auth.response;

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid schedule payload" }, { status: 400 });
  }

  const scheduledAt = new Date(parsed.data.scheduledAt);
  if (scheduledAt <= new Date()) {
    return NextResponse.json({ message: "Scheduled publish time must be in the future" }, { status: 400 });
  }

  const productIds = Array.from(new Set(parsed.data.productIds));

  const result = await prisma.product.updateMany({
    where: {
      id: { in: productIds },
      status: { not: ProductStatus.ARCHIVED },
    },
    data: {
      status: ProductStatus.SCHEDULED,
      scheduledAt,
      publishedAt: null,
    },
  });

  await recordAdminActivity({
    action: `Scheduled ${result.count} product${result.count === 1 ? "" : "s"} for publishing`,
    entityType: "product",
    actor: auth.access.name,
    metadata: { productIds, scheduledAt: scheduledAt.toISOString(), count: result.count },
  });

  return NextResponse.json({
    ok: true,
    count: result.count,
    scheduledAt: scheduledAt.toISOString(),
  });
}
