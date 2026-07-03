import { NextResponse } from "next/server";
import { DiscountType } from "@prisma/client";
import { z } from "zod";
import { recordAdminActivity } from "@/lib/admin-activity";
import { requireAdminApiPermission } from "@/lib/admin-api";
import { parseCouponList, serializeCouponList } from "@/lib/coupon-eligibility";
import { prisma } from "@/lib/prisma";

function decimalToNumber(value: { toNumber?: () => number } | number) {
  if (typeof value === "number") return value;
  return value?.toNumber?.() ?? 0;
}

function mapCoupon(c: {
  id: string;
  code: string;
  type: string;
  value: { toNumber?: () => number } | number;
  minimumAmount: { toNumber?: () => number } | number | null;
  usageLimit: number | null;
  expiresAt: Date | null;
  combinable: boolean;
  eligibleProductIds: string | null;
  eligibleCategories: string | null;
  eligibleCollections: string | null;
  excludedProductIds: string | null;
  createdAt: Date;
  _count: { orders: number };
}) {
  return {
    id: c.id,
    code: c.code,
    type: c.type as "PERCENTAGE" | "FIXED" | "FREE_SHIPPING",
    value: decimalToNumber(c.value),
    minimumAmount: c.minimumAmount ? decimalToNumber(c.minimumAmount) : undefined,
    usageLimit: c.usageLimit ?? undefined,
    usageCount: c._count.orders,
    expiresAt: c.expiresAt?.toISOString() ?? undefined,
    combinable: c.combinable,
    eligibleProductIds: parseCouponList(c.eligibleProductIds),
    eligibleCategories: parseCouponList(c.eligibleCategories),
    eligibleCollections: parseCouponList(c.eligibleCollections),
    excludedProductIds: parseCouponList(c.excludedProductIds),
    createdAt: c.createdAt.toISOString(),
  };
}

export async function GET() {
  const auth = await requireAdminApiPermission("marketing:write");
  if ("response" in auth) return auth.response;

  const coupons = await prisma.coupon.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { orders: true } } },
  });
  return NextResponse.json({ coupons: coupons.map(mapCoupon) });
}

const createSchema = z.object({
  code: z.string().min(1),
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
  if (data.expiresAt && new Date(data.expiresAt).getTime() <= Date.now()) {
    context.addIssue({ code: "custom", path: ["expiresAt"], message: "Expiry must be in the future" });
  }
});

export async function POST(request: Request) {
  const auth = await requireAdminApiPermission("marketing:write");
  if ("response" in auth) return auth.response;

  const parsed = createSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid coupon payload", errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = parsed.data;

  try {
    const coupon = await prisma.coupon.create({
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
      action: `Created coupon ${coupon.code}`,
      entityType: "coupon",
      entityId: coupon.id,
      actor: auth.access.name,
      metadata: { type: coupon.type, value: decimalToNumber(coupon.value), usageLimit: coupon.usageLimit },
    });

    return NextResponse.json({ coupon: mapCoupon(coupon) }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create coupon";
    if (message.includes("Unique constraint")) {
      return NextResponse.json({ message: "Coupon code already exists" }, { status: 409 });
    }
    return NextResponse.json({ message }, { status: 500 });
  }
}
