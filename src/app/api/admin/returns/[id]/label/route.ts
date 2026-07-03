import { NextResponse } from "next/server";
import { z } from "zod";
import { recordAdminActivity } from "@/lib/admin-activity";
import { requireAdminApiPermission } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import { buildShippingLabelHtml, createShippingLabelId, createTrackingNumber } from "@/lib/shipping-labels";

const schema = z.object({
  carrier: z.string().trim().min(2).max(80).default("Velora Returns"),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApiPermission("orders:write");
  if ("response" in auth) return auth.response;
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ message: "Invalid label payload" }, { status: 400 });

  const { id } = await params;
  const returnRequest = await prisma.returnRequest.findUnique({
    where: { id },
    include: {
      returnShipment: true,
      items: true,
      order: { include: { shippingAddress: true } },
    },
  });
  if (!returnRequest) return NextResponse.json({ message: "Return request not found." }, { status: 404 });
  if (!returnRequest.returnShipment?.pickupStart || !returnRequest.returnShipment.pickupEnd) {
    return NextResponse.json({ message: "Schedule a pickup window before creating the return label." }, { status: 409 });
  }
  if (!returnRequest.order.shippingAddress) {
    return NextResponse.json({ message: "The original delivery address is unavailable." }, { status: 409 });
  }

  const labelId = returnRequest.returnShipment.labelId ?? createShippingLabelId();
  const trackingNo = returnRequest.returnShipment.trackingNo ?? createTrackingNumber(`RET-${returnRequest.order.orderNumber}`);
  const shipment = await prisma.returnShipment.update({
    where: { requestId: returnRequest.id },
    data: {
      carrier: parsed.data.carrier,
      trackingNo,
      labelId,
      labelFormat: "HTML_4X6",
      labelCreatedAt: returnRequest.returnShipment.labelCreatedAt ?? new Date(),
      status: returnRequest.returnShipment.status === "pickup_scheduled" ? "label_created" : returnRequest.returnShipment.status,
    },
  });
  const address = [
    returnRequest.order.shippingAddress.line1,
    returnRequest.order.shippingAddress.line2,
    returnRequest.order.shippingAddress.city,
    returnRequest.order.shippingAddress.postalCode,
    returnRequest.order.shippingAddress.country,
  ].filter(Boolean).join(", ");
  const labelHtml = buildShippingLabelHtml({
    labelId,
    orderNumber: returnRequest.order.orderNumber,
    carrier: shipment.carrier ?? parsed.data.carrier,
    trackingNo,
    customerName: returnRequest.order.shippingAddress.name,
    phone: returnRequest.order.shippingAddress.phone,
    address,
    itemCount: returnRequest.items.reduce((sum, item) => sum + item.quantity, 0),
    addressLabel: "Pickup from",
    serviceLabel: "UAE Return",
  });

  await recordAdminActivity({
    action: `Generated return label for ${returnRequest.order.orderNumber}`,
    entityType: "return_request",
    entityId: returnRequest.id,
    actor: auth.access.name,
    metadata: { labelId, carrier: shipment.carrier, trackingNo },
  });
  return NextResponse.json({ shipment, labelHtml });
}
