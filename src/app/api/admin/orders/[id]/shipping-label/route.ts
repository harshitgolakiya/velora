import { NextResponse } from "next/server";
import { z } from "zod";
import { recordAdminActivity } from "@/lib/admin-activity";
import { requireAdminApiPermission } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import {
  buildShippingLabelHtml,
  createShippingLabelId,
  createTrackingNumber,
} from "@/lib/shipping-labels";
import { sendShipmentNotificationEmail } from "@/lib/shipment-email";

const schema = z.object({
  carrier: z.string().trim().min(2).max(80).default("Velora Logistics"),
  weightGrams: z.coerce.number().int().min(50).max(50_000).default(500),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApiPermission("orders:write");
  if ("response" in auth) return auth.response;
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid label payload" }, { status: 400 });
  }
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: { shipment: true, shippingAddress: true, items: true },
  });
  if (!order) {
    return NextResponse.json({ message: "Order not found" }, { status: 404 });
  }
  if (!order.shippingAddress) {
    return NextResponse.json(
      { message: "A shipping address is required before generating a label" },
      { status: 409 },
    );
  }

  const labelId = order.shipment?.labelId ?? createShippingLabelId();
  const trackingNo =
    order.shipment?.trackingNo ?? createTrackingNumber(order.orderNumber);
  const carrier = parsed.data.carrier;
  const shipment = await prisma.shipment.upsert({
    where: { orderId: order.id },
    create: {
      orderId: order.id,
      carrier,
      trackingNo,
      status: "label_created",
      labelId,
      labelFormat: "HTML_4X6",
      labelCreatedAt: new Date(),
      weightGrams: parsed.data.weightGrams,
    },
    update: {
      carrier,
      trackingNo,
      status:
        order.shipment?.status === "shipped"
          ? order.shipment.status
          : "label_created",
      labelId,
      labelFormat: "HTML_4X6",
      labelCreatedAt: order.shipment?.labelCreatedAt ?? new Date(),
      weightGrams: parsed.data.weightGrams,
    },
  });
  const shipmentChanged = !order.shipment
    || shipment.status !== order.shipment.status
    || shipment.carrier !== order.shipment.carrier
    || shipment.trackingNo !== order.shipment.trackingNo;
  const shipmentEvent = shipmentChanged
    ? await prisma.shipmentEvent.create({
        data: {
          shipmentId: shipment.id,
          status: shipment.status,
          carrier: shipment.carrier,
          trackingNo: shipment.trackingNo,
          message: "Shipping label created",
          actor: auth.access.name,
        },
      })
    : null;
  const address = [
    order.shippingAddress.line1,
    order.shippingAddress.line2,
    order.shippingAddress.city,
    order.shippingAddress.postalCode,
    order.shippingAddress.country,
  ]
    .filter(Boolean)
    .join(", ");
  const labelHtml = buildShippingLabelHtml({
    labelId,
    orderNumber: order.orderNumber,
    carrier,
    trackingNo,
    customerName: order.shippingAddress.name,
    phone: order.shippingAddress.phone,
    address,
    itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
    weightGrams: parsed.data.weightGrams,
  });

  await recordAdminActivity({
    action: `Generated shipping label for ${order.orderNumber}`,
    entityType: "order",
    entityId: order.id,
    actor: auth.access.name,
    metadata: { labelId, carrier, trackingNo },
  });

  if (shipmentEvent) {
    await sendShipmentNotificationEmail({
      recipient: order.email,
      orderId: order.id,
      orderNumber: order.orderNumber,
      eventId: shipmentEvent.id,
      status: shipmentEvent.status,
      carrier: shipmentEvent.carrier,
      trackingNo: shipmentEvent.trackingNo,
      locale: order.locale,
    });
  }

  return NextResponse.json({ shipment, shipmentEvent, labelHtml });
}
