import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSameOriginRequest } from "@/lib/request-security";

const schema = z.object({
  orderNumber: z.string().trim().min(3).max(50),
  email: z.email(),
});

export async function POST(request: Request) {
  const originError = requireSameOriginRequest(request);
  if (originError) return originError;

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Enter a valid order number and email address" },
      { status: 400 },
    );
  }
  const order = await prisma.order.findFirst({
    where: {
      orderNumber: parsed.data.orderNumber.toUpperCase(),
      email: parsed.data.email.toLowerCase(),
    },
    include: { payment: true, shipment: { include: { events: { orderBy: { createdAt: "asc" } } } }, items: true },
  });
  if (!order) {
    return NextResponse.json(
      { message: "No order matched those details" },
      { status: 404 },
    );
  }
  return NextResponse.json({
    order: {
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentProvider: order.payment?.provider,
      fulfillmentStatus: order.fulfillmentStatus,
      carrier: order.shipment?.carrier,
      trackingNo: order.shipment?.trackingNo,
      shipmentStatus: order.shipment?.status,
      shippedAt: order.shipment?.shippedAt?.toISOString(),
      deliveredAt: order.shipment?.deliveredAt?.toISOString(),
      shipmentEvents: order.shipment?.events.map((event) => ({
        id: event.id,
        status: event.status,
        carrier: event.carrier,
        trackingNo: event.trackingNo,
        message: event.message,
        createdAt: event.createdAt.toISOString(),
      })) ?? [],
      itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
      updatedAt: order.updatedAt.toISOString(),
    },
  });
}
