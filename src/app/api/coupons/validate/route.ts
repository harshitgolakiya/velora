import { NextResponse } from "next/server";
import { z } from "zod";
import { getCouponEligibleSubtotal } from "@/lib/coupon-eligibility";
import { prisma } from "@/lib/prisma";
import { requireSameOriginRequest } from "@/lib/request-security";

const schema = z.object({
  code: z.string().trim().min(1),
  subtotal: z.coerce.number().min(0),
  items: z.array(z.object({
    productId: z.string().optional().nullable(),
    category: z.string().optional().nullable(),
    collections: z.array(z.string()).optional().nullable(),
    lineTotal: z.coerce.number().min(0),
  })).optional().default([]),
});

export async function POST(request: Request) {
  const originError = requireSameOriginRequest(request);
  if (originError) return originError;

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid coupon request" }, { status: 400 });
  }

  const coupon = await prisma.coupon.findUnique({
    where: { code: parsed.data.code.toUpperCase() },
    include: { _count: { select: { orders: true } } },
  });
  if (!coupon) {
    return NextResponse.json(
      { code: "NOT_FOUND", message: "Coupon code not found" },
      { status: 404 },
    );
  }
  if (coupon.expiresAt && coupon.expiresAt.getTime() <= Date.now()) {
    return NextResponse.json(
      {
        code: "EXPIRED",
        message: "This coupon has expired",
        expiresAt: coupon.expiresAt.toISOString(),
      },
      { status: 400 },
    );
  }
  if (coupon.usageLimit && coupon._count.orders >= coupon.usageLimit) {
    return NextResponse.json(
      {
        code: "USAGE_LIMIT",
        message: "This coupon has reached its usage limit",
        usageLimit: coupon.usageLimit,
        usageCount: coupon._count.orders,
      },
      { status: 400 },
    );
  }
  const minimumAmount = coupon.minimumAmount ? Number(coupon.minimumAmount) : 0;
  if (parsed.data.subtotal < minimumAmount) {
    const remaining = minimumAmount - parsed.data.subtotal;
    return NextResponse.json(
      {
        code: "MINIMUM_AMOUNT",
        message: `Add AED ${remaining.toFixed(2)} more to use ${coupon.code}`,
        minimumAmount,
        remaining,
      },
      { status: 400 },
    );
  }

  const value = Number(coupon.value);
  const eligibleSubtotal = getCouponEligibleSubtotal(coupon, parsed.data.items, parsed.data.subtotal);
  if (eligibleSubtotal <= 0) {
    return NextResponse.json(
      {
        code: "INELIGIBLE_CART",
        message: "This coupon does not apply to the items in your cart",
      },
      { status: 400 },
    );
  }
  const discount =
    coupon.type === "PERCENTAGE"
      ? Math.min(eligibleSubtotal, eligibleSubtotal * (value / 100))
      : coupon.type === "FIXED"
        ? Math.min(eligibleSubtotal, value)
        : 0;

  return NextResponse.json({
    coupon: {
      id: coupon.id,
      code: coupon.code,
      type: coupon.type,
      value,
      minimumAmount,
      discount,
      freeShipping: coupon.type === "FREE_SHIPPING",
      combinable: coupon.combinable,
      eligibleSubtotal,
      usageLimit: coupon.usageLimit,
      usageCount: coupon._count.orders,
      expiresAt: coupon.expiresAt?.toISOString(),
    },
  });
}
