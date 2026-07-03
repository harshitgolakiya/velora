import "server-only";

import { deliverEmail } from "@/lib/email-delivery";
import { prisma } from "@/lib/prisma";
import { localizedSiteUrl, normalizeEmailLocale, transactionalEmailShell } from "@/lib/transactional-email";

function titleCaseStatus(status: string) {
  return status.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function statusGuidance(status: string) {
  const guidance: Record<string, string> = {
    PENDING: "Your request is in the review queue.",
    AWAITING_CUSTOMER: "Support needs more information. Open the request and reply from your account.",
    APPROVED: "Your request was approved. Pickup scheduling will follow.",
    PICKUP_SCHEDULED: "Your pickup window and return-label details are available in your account.",
    PICKED_UP: "The carrier has collected your return.",
    RECEIVED: "The warehouse received your return and will inspect it next.",
    INSPECTED: "Warehouse inspection is complete. The requested resolution is being prepared.",
    REFUND_PROCESSING: "Your refund has been submitted and is awaiting provider confirmation.",
    REPLACEMENT_CREATED: "Your replacement order has been created and is ready for fulfillment.",
    COMPLETED: "Your return request is complete.",
    REJECTED: "The request was not approved. Review the support note in your account.",
    CANCELLED: "The return request was cancelled.",
  };
  return guidance[status] ?? "Your return request was updated.";
}

function arabicStatusLabel(status: string) {
  const labels: Record<string, string> = {
    PENDING: "قيد المراجعة",
    AWAITING_CUSTOMER: "بانتظار ردك",
    APPROVED: "تمت الموافقة",
    PICKUP_SCHEDULED: "تم تحديد موعد الاستلام",
    PICKED_UP: "تم الاستلام من العميل",
    RECEIVED: "تم الاستلام في المستودع",
    INSPECTED: "اكتمل الفحص",
    REFUND_PROCESSING: "جاري استرداد المبلغ",
    REPLACEMENT_CREATED: "تم إنشاء طلب الاستبدال",
    COMPLETED: "اكتمل الطلب",
    REJECTED: "لم تتم الموافقة",
    CANCELLED: "تم الإلغاء",
  };
  return labels[status] ?? "تم تحديث طلب الإرجاع";
}

function arabicStatusGuidance(status: string) {
  const guidance: Record<string, string> = {
    PENDING: "طلبك في قائمة المراجعة.",
    AWAITING_CUSTOMER: "يحتاج فريق الدعم إلى معلومات إضافية. افتح الطلب وأرسل الرد من حسابك.",
    APPROVED: "تمت الموافقة على طلبك. سيتم ترتيب الاستلام بعد ذلك.",
    PICKUP_SCHEDULED: "تفاصيل موعد الاستلام وملصق الإرجاع متاحة في حسابك.",
    PICKED_UP: "استلمت شركة الشحن طلب الإرجاع.",
    RECEIVED: "استلم المستودع طلب الإرجاع وسيتم فحصه بعد ذلك.",
    INSPECTED: "اكتمل فحص المستودع ويتم تجهيز النتيجة المطلوبة.",
    REFUND_PROCESSING: "تم إرسال طلب استرداد المبلغ وينتظر تأكيد مزود الدفع.",
    REPLACEMENT_CREATED: "تم إنشاء طلب الاستبدال وهو جاهز للتجهيز.",
    COMPLETED: "اكتمل طلب الإرجاع.",
    REJECTED: "لم تتم الموافقة على الطلب. راجع ملاحظة الدعم في حسابك.",
    CANCELLED: "تم إلغاء طلب الإرجاع.",
  };
  return guidance[status] ?? "تم تحديث طلب الإرجاع.";
}

export function getReturnNotificationContent(status: string, locale?: string | null) {
  const isArabic = normalizeEmailLocale(locale) === "ar";
  return {
    label: isArabic ? arabicStatusLabel(status) : titleCaseStatus(status),
    guidance: isArabic ? arabicStatusGuidance(status) : statusGuidance(status),
  };
}

async function deliverOnce(input: Parameters<typeof deliverEmail>[0]) {
  if (input.sourceKey) {
    const existing = await prisma.emailDelivery.findUnique({ where: { sourceKey: input.sourceKey }, select: { id: true } });
    if (existing) return existing;
  }
  return deliverEmail(input);
}

export async function sendReturnLifecycleNotification(input: {
  requestId: string;
  eventId: string;
  orderId: string;
  orderNumber: string;
  recipient: string;
  status: string;
  message?: string | null;
  locale?: string | null;
}) {
  const normalizedLocale = normalizeEmailLocale(input.locale);
  const isArabic = normalizedLocale === "ar";
  const content = getReturnNotificationContent(input.status, normalizedLocale);
  const statusLabel = content.label;
  const customer = deliverOnce({
    recipient: input.recipient,
    subject: isArabic ? `${statusLabel}: طلب الإرجاع ${input.orderNumber}` : `${statusLabel}: return ${input.orderNumber}`,
    orderId: input.orderId,
    sourceKey: `return:${input.requestId}:${input.eventId}:customer`,
    metadata: { type: "RETURN_LIFECYCLE", requestId: input.requestId, status: input.status, locale: normalizedLocale },
    html: transactionalEmailShell({
      locale: normalizedLocale,
      heading: statusLabel,
      body: `${content.guidance}${input.message ? `<br><span style="color:#5f646d">${input.message.replace(/[<>]/g, "")}</span>` : ""}`,
      ctaLabel: isArabic ? "عرض الطلب" : "View request",
      ctaHref: localizedSiteUrl(`/account/orders/${encodeURIComponent(input.orderNumber)}/return`, normalizedLocale),
    }),
  });
  const adminRecipient = process.env.ADMIN_NOTIFICATION_EMAIL?.trim();
  const admin = adminRecipient ? deliverOnce({
    recipient: adminRecipient,
    subject: `Return ${input.orderNumber}: ${statusLabel}`,
    orderId: input.orderId,
    sourceKey: `return:${input.requestId}:${input.eventId}:admin`,
    metadata: { type: "RETURN_ADMIN_ALERT", requestId: input.requestId, status: input.status },
    html: `<div style="font-family:Arial,sans-serif"><h1>Return request updated</h1><p>Order ${input.orderNumber}</p><p>Status: ${titleCaseStatus(input.status)}</p><p>${input.message?.replace(/[<>]/g, "") ?? "No additional note."}</p><a href="${localizedSiteUrl("/admin", "en")}">Open admin</a></div>`,
  }) : Promise.resolve(null);
  return Promise.allSettled([customer, admin]);
}

export async function sendReturnAdminActivityNotification(input: {
  requestId: string;
  activityId: string;
  orderId: string;
  orderNumber: string;
  status: string;
  message: string;
}) {
  const recipient = process.env.ADMIN_NOTIFICATION_EMAIL?.trim();
  if (!recipient) return null;
  return deliverOnce({
    recipient,
    subject: `Customer activity: ${input.orderNumber}`,
    orderId: input.orderId,
    sourceKey: `return:${input.requestId}:${input.activityId}:admin-activity`,
    metadata: { type: "RETURN_CUSTOMER_ACTIVITY", requestId: input.requestId, status: input.status },
    html: `<div style="font-family:Arial,sans-serif"><h1>Customer return activity</h1><p>Order ${input.orderNumber}</p><p>${input.message.replace(/[<>]/g, "")}</p><a href="${localizedSiteUrl("/admin", "en")}">Review request</a></div>`,
  });
}
