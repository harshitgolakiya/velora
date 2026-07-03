import "server-only";

import { deliverEmail } from "./email-delivery";
import { localizedSiteUrl, normalizeEmailLocale, transactionalEmailShell } from "./transactional-email";

export function sendRefundNotificationEmail({
  recipient,
  orderId,
  orderNumber,
  refundId,
  amount,
  totalRefunded,
  kind,
  locale,
}: {
  recipient: string;
  orderId: string;
  orderNumber: string;
  refundId: string;
  amount: number;
  totalRefunded: number;
  kind: string;
  locale?: string | null;
}) {
  const normalizedLocale = normalizeEmailLocale(locale);
  const isArabic = normalizedLocale === "ar";
  return deliverEmail({
    recipient,
    subject: isArabic ? `تم تأكيد استرداد المبلغ للطلب ${orderNumber}` : `${kind === "FULL" ? "Refund" : "Partial refund"} confirmed for ${orderNumber}`,
    orderId,
    sourceKey: `refund:${refundId}`,
    metadata: { type: "REFUND", amount, totalRefunded, kind, locale: normalizedLocale },
    html: transactionalEmailShell({
      locale,
      heading: isArabic ? "تم تأكيد استرداد المبلغ" : kind === "FULL" ? "Your refund is confirmed" : "Your partial refund is confirmed",
      body: isArabic
        ? `تم تسجيل استرداد بقيمة AED ${amount.toFixed(2)} للطلب ${orderNumber}. إجمالي المبلغ المسترد: AED ${totalRefunded.toFixed(2)}. تختلف مدة المعالجة حسب مزود الدفع.`
        : `AED ${amount.toFixed(2)} has been recorded for order ${orderNumber}. Total refunded: AED ${totalRefunded.toFixed(2)}. Bank processing times depend on the original payment provider.`,
      ctaLabel: isArabic ? "عرض الطلب" : "View order",
      ctaHref: localizedSiteUrl(`/account/orders/${encodeURIComponent(orderNumber)}`, normalizedLocale),
    }),
  });
}
