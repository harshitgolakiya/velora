import "server-only";

import { deliverEmail } from "./email-delivery";
import { localizedSiteUrl, normalizeEmailLocale, transactionalEmailShell } from "./transactional-email";

export function sendShipmentNotificationEmail({
  recipient,
  orderId,
  orderNumber,
  eventId,
  status,
  carrier,
  trackingNo,
  locale,
}: {
  recipient: string;
  orderId: string;
  orderNumber: string;
  eventId: string;
  status: string;
  carrier?: string | null;
  trackingNo?: string | null;
  locale?: string | null;
}) {
  const normalizedLocale = normalizeEmailLocale(locale);
  const isArabic = normalizedLocale === "ar";
  const label = status.toLowerCase() === "delivered" ? "delivered" : status.toLowerCase() === "shipped" ? "shipped" : "updated";
  const arabicLabel = status.toLowerCase() === "delivered" ? "تم التسليم" : status.toLowerCase() === "shipped" ? "تم الشحن" : "تم التحديث";
  const body = isArabic
    ? `تم ${status.replace(/_/g, " ").toLowerCase()} لطلبك ${orderNumber}.${carrier ? ` شركة الشحن: ${carrier}.` : ""}${trackingNo ? ` رقم التتبع: ${trackingNo}.` : ""}`
    : `Order ${orderNumber} is now ${status.replace(/_/g, " ").toLowerCase()}.${carrier ? ` Carrier: ${carrier}.` : ""}${trackingNo ? ` Tracking number: ${trackingNo}.` : ""}`;
  return deliverEmail({
    recipient,
    subject: isArabic ? `تحديث شحنة الطلب ${orderNumber}` : `Order ${orderNumber} shipment ${label}`,
    orderId,
    sourceKey: `shipment-event:${eventId}`,
    metadata: { type: "SHIPMENT", status, carrier, trackingNo, locale: normalizedLocale },
    html: transactionalEmailShell({
      locale,
      heading: isArabic ? `الشحنة ${arabicLabel}` : `Shipment ${label}`,
      body,
      ctaLabel: isArabic ? "تتبع الطلب" : "Track order",
      ctaHref: localizedSiteUrl("/track-order", normalizedLocale),
    }),
  });
}
