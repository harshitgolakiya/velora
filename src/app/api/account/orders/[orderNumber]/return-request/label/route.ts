import { getAuthorizedAccountOrder } from "@/lib/account-orders";
import { requireCustomerSession } from "@/lib/account-data";
import { buildShippingLabelHtml } from "@/lib/shipping-labels";

export async function GET(_request: Request, { params }: { params: Promise<{ orderNumber: string }> }) {
  const session = await requireCustomerSession();
  if (!session?.user?.id || !session.user.email) return new Response("Unauthorized", { status: 401 });
  const { orderNumber } = await params;
  const order = await getAuthorizedAccountOrder({ orderNumber, userId: session.user.id, email: session.user.email });
  const returnRequest = order?.returnRequests[0];
  const shipment = returnRequest?.returnShipment;
  if (!order || !returnRequest || !shipment?.labelId || !shipment.trackingNo || !shipment.carrier || !order.shippingAddress) {
    return new Response("Return label not available", { status: 404 });
  }
  const address = [order.shippingAddress.line1, order.shippingAddress.line2, order.shippingAddress.city, order.shippingAddress.postalCode, order.shippingAddress.country].filter(Boolean).join(", ");
  const html = buildShippingLabelHtml({
    labelId: shipment.labelId,
    orderNumber: order.orderNumber,
    carrier: shipment.carrier,
    trackingNo: shipment.trackingNo,
    customerName: order.shippingAddress.name,
    phone: order.shippingAddress.phone,
    address,
    itemCount: returnRequest.items.reduce((sum, item) => sum + item.quantity, 0),
    addressLabel: "Pickup from",
    serviceLabel: "UAE Return",
  });
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store",
      "Content-Disposition": `inline; filename="${order.orderNumber}-return-label.html"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
