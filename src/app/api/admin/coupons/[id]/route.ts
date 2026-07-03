import { NextResponse } from "next/server";
import { DiscountType } from "@prisma/client";
import { z } from "zod";
import { recordAdminActivity } from "@/lib/admin-activity";
import { requireAdminApiPermission } from "@/lib/admin-api";
import { parseCouponList, serializeCouponList } from "@/lib/coupon-eligibility";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  code: z.string().trim().min(1),
  type: z.enum(["PERCENTAGE", "FIXED", "FREE_SHIPPING"]),
  value: z.coerce.number().min(0),
  minimumAmount: z.coerce.number().min(0).optional().nullable(),
  usageLimit: z.coerce.number().int().positive().optional().nullable(),
  expiresAt: z.string().optional().nullable(),
  combinable: z.boolean().optional().default(false),
  eligibleProductIds: z.union([z.string(), z.array(z.string())]).optional().nullable(),
  eligibleCategories: z.union([z.string(), z.array(z.string())]).optional().nullable(),
  eligibleCollections: z.union([z.string(), z.array(z.string())]).optional().nullable(),
  excludedProductIds: z.union([z.string(), z.array(z.string())]).optional().nullable(),
}).superRefine((data, context) => {
  if (data.type === "PERCENTAGE" && data.value > 100) {
    context.addIssue({ code: "custom", path: ["value"], message: "Percentage discounts cannot exceed 100%" });
  }
  if (data.type === "FREE_SHIPPING" && data.value !== 0) {
    context.addIssue({ code: "custom", path: ["value"], message: "Free-shipping coupons must have a value of 0" });
  }
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApiPermission("marketing:write");
  if ("response" in auth) return auth.response;
  const { id } = await params;
  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid coupon payload", errors: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  try {
    const coupon = await prisma.coupon.update({
      where: { id },
      data: {
        code: data.code.toUpperCase(),
        type: data.type as DiscountType,
        value: data.value,
        minimumAmount: data.minimumAmount ?? null,
        usageLimit: data.usageLimit ?? null,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        combinable: data.combinable,
        eligibleProductIds: serializeCouponList(data.eligibleProductIds),
        eligibleCategories: serializeCouponList(data.eligibleCategories),
        eligibleCollections: serializeCouponList(data.eligibleCollections),
        excludedProductIds: serializeCouponList(data.excludedProductIds),
      },
      include: { _count: { select: { orders: true } } },
    });
    await recordAdminActivity({
      action: `Updated coupon ${coupon.code}`,
      entityType: "coupon",
      entityId: coupon.id,
      actor: auth.access.name,
      metadata: data,
    });
    return NextResponse.json({
      coupon: {
        id: coupon.id,
        code: coupon.code,
        type: coupon.type,
        value: Number(coupon.value),
        minimumAmount: coupon.minimumAmount ? Number(coupon.minimumAmount) : undefined,
        usageLimit: coupon.usageLimit ?? undefined,
        usageCount: coupon._count.orders,
        expiresAt: coupon.expiresAt?.toISOString() ?? undefined,
        combinable: coupon.combinable,
        eligibleProductIds: parseCouponList(coupon.eligibleProductIds),
        eligibleCategories: parseCouponList(coupon.eligibleCategories),
        eligibleCollections: parseCouponList(coupon.eligibleCollections),
        excludedProductIds: parseCouponList(coupon.excludedProductIds),
        createdAt: coupon.createdAt.toISOString(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update coupon";
    return NextResponse.json({ message }, { status: message.includes("Unique constraint") ? 409 : 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApiPermission("marketing:write");
  if ("response" in auth) return auth.response;

  const { id } = await params;

  try {
    const coupon = await prisma.coupon.delete({ where: { id } });
    await recordAdminActivity({
      action: `Deleted coupon ${coupon.code}`,
      entityType: "coupon",
      entityId: coupon.id,
      actor: auth.access.name,
      metadata: { type: coupon.type },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete coupon";
    const statusCode = message.includes("Record to delete not found") ? 404 : 500;
    return NextResponse.json({ message }, { status: statusCode });
  }
}
