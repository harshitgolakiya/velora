import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ProductAlertType, ProductStatus } from "@prisma/client";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireSameOriginRequest } from "@/lib/request-security";

const alertSchema = z.object({
  type: z.enum(["BACK_IN_STOCK", "PRICE_DROP"]),
  email: z.email().transform((email) => email.toLowerCase().trim()),
  productId: z.string().trim().min(1),
  variantId: z.string().trim().min(1).optional(),
  targetPrice: z.number().positive().optional(),
  locale: z.string().trim().min(2).max(8).optional(),
});

export async function POST(request: Request) {
  const originError = requireSameOriginRequest(request);
  if (originError) return originError;

  const parsed = alertSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Check alert details", errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const session = await getServerSession(authOptions);
  const data = parsed.data;
  if (session?.user?.id && session.user.email === data.email) {
    const preferences = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { productAlertEmails: true },
    });
    if (preferences && !preferences.productAlertEmails) {
      return NextResponse.json({ message: "Enable product alerts in your account preferences first." }, { status: 409 });
    }
  }
  const product = await prisma.product.findFirst({
    where: {
      id: data.productId,
      status: ProductStatus.PUBLISHED,
    },
    select: {
      id: true,
      title: true,
      price: true,
      salePrice: true,
    },
  });
  if (!product) return NextResponse.json({ message: "Product not found" }, { status: 404 });

  if (data.type === "BACK_IN_STOCK") {
    if (!data.variantId) {
      return NextResponse.json({ message: "Choose a size and color first." }, { status: 400 });
    }
    const variant = await prisma.productVariant.findFirst({
      where: {
        id: data.variantId,
        productId: product.id,
      },
      select: { id: true, stock: true, reservedStock: true, allowBackorder: true },
    });
    if (!variant) return NextResponse.json({ message: "Variant not found" }, { status: 404 });
    if (variant.stock - variant.reservedStock > 0 || variant.allowBackorder) {
      return NextResponse.json(
        { message: "This variant is currently available." },
        { status: 409 },
      );
    }
  }

  const existing = await prisma.productAlertSubscription.findFirst({
    where: {
      email: data.email,
      type: data.type as ProductAlertType,
      productId: product.id,
      variantId: data.variantId ?? null,
    },
    select: { id: true, status: true },
  });
  if (existing?.status === "ACTIVE") {
    return NextResponse.json({
      created: false,
      message: "You are already subscribed to this alert.",
    });
  }

  const alert = existing
    ? await prisma.productAlertSubscription.update({
      where: { id: existing.id },
      data: {
        status: "ACTIVE",
        locale: data.locale ?? "en",
        targetPrice: data.type === "PRICE_DROP" ? data.targetPrice ?? Number(product.salePrice ?? product.price) : null,
        userId: session?.user?.email === data.email ? session.user.id : undefined,
      },
      select: { id: true, type: true },
    })
    : await prisma.productAlertSubscription.create({
      data: {
      type: data.type as ProductAlertType,
      email: data.email,
      locale: data.locale ?? "en",
      productId: product.id,
      variantId: data.variantId,
      targetPrice:
        data.type === "PRICE_DROP"
          ? data.targetPrice ?? Number(product.salePrice ?? product.price)
          : undefined,
      userId: session?.user?.email === data.email ? session.user.id : undefined,
      },
      select: { id: true, type: true },
    });

  return NextResponse.json({
    created: true,
    alert,
    message:
      data.type === "BACK_IN_STOCK"
        ? "Back-in-stock alert saved."
        : "Price-drop alert saved.",
  }, { status: 201 });
}

export async function DELETE(request: Request) {
  const originError = requireSameOriginRequest(request);
  if (originError) return originError;

  const parsed = alertSchema.pick({ type: true, email: true, productId: true, variantId: true }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Check alert details" }, { status: 400 });
  const updated = await prisma.productAlertSubscription.updateMany({
    where: {
      email: parsed.data.email,
      type: parsed.data.type as ProductAlertType,
      productId: parsed.data.productId,
      variantId: parsed.data.variantId ?? null,
      status: "ACTIVE",
    },
    data: { status: "UNSUBSCRIBED" },
  });
  return NextResponse.json({ removed: updated.count > 0, message: updated.count ? "Alert removed." : "No active alert was found." });
}
