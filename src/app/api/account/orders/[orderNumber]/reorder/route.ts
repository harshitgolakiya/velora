import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { ProductStatus } from "@prisma/client";
import { getAuthorizedAccountOrder } from "@/lib/account-orders";
import { requireCustomerSession } from "@/lib/account-data";
import { syncCartReservations } from "@/lib/cart-reservations";
import { getCmsProducts } from "@/lib/cms";
import { prisma } from "@/lib/prisma";
import { requireSameOriginRequest } from "@/lib/request-security";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orderNumber: string }> },
) {
  const originError = requireSameOriginRequest(request);
  if (originError) return originError;

  const session = await requireCustomerSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;
  const email = session.user.email;
  if (!userId || !email) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { orderNumber } = await params;
  const order = await getAuthorizedAccountOrder({
    orderNumber,
    userId,
    email,
  });
  if (!order) return NextResponse.json({ message: "Not found" }, { status: 404 });

  const variantIds = order.items
    .map((item) => item.variantId)
    .filter(Boolean) as string[];
  if (!variantIds.length) {
    return NextResponse.json(
      { message: "This order does not contain reorderable variants." },
      { status: 409 },
    );
  }

  const variants = await prisma.productVariant.findMany({
    where: {
      id: { in: variantIds },
      product: { status: ProductStatus.PUBLISHED },
    },
    include: {
      product: true,
      color: true,
      size: true,
    },
  });
  const variantById = new Map(variants.map((variant) => [variant.id, variant]));

  const requested = order.items.flatMap((item) => {
    if (!item.variantId) return [];
    const variant = variantById.get(item.variantId);
    if (!variant) return [];
    const available = variant.allowBackorder
      ? item.quantity
      : Math.max(0, Math.min(item.quantity, variant.stock - variant.reservedStock));
    if (available <= 0) return [];
    return [{ variantId: item.variantId, quantity: available }];
  });

  if (!requested.length) {
    return NextResponse.json(
      { message: "The variants from this order are currently unavailable." },
      { status: 409 },
    );
  }

  const cartSessionKey = randomUUID();
  const reservation = await syncCartReservations(cartSessionKey, requested);
  const products = await getCmsProducts();

  const cart = requested.flatMap((line) => {
    const product = products.find((item) =>
      item.variants?.some((variant) => variant.id === line.variantId),
    );
    const variant = product?.variants?.find((item) => item.id === line.variantId);
    if (!product || !variant) return [];
    return [{
      product,
      variantId: variant.id,
      size: variant.size.name,
      color: variant.color.name,
      quantity: line.quantity,
    }];
  });

  if (!cart.length) {
    return NextResponse.json(
      { message: "Unable to rebuild this order from the current catalog." },
      { status: 409 },
    );
  }

  return NextResponse.json({
    cart,
    cartSessionKey,
    cartExpiresAt: reservation.expiresAt,
    message:
      cart.length === order.items.length
        ? "Available items were added to your bag."
        : "Some unavailable items were skipped and the rest were added to your bag.",
  });
}
