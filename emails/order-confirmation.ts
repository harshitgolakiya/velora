import { localizedSiteUrl, normalizeEmailLocale, transactionalEmailShell } from "../src/lib/transactional-email";

export function orderConfirmationEmail(orderNumber: string, locale?: string | null) {
  const isArabic = normalizeEmailLocale(locale) === "ar";
  return {
    subject: isArabic ? `تم تأكيد طلب Velora ${orderNumber}` : `Velora order ${orderNumber} confirmed`,
    html: transactionalEmailShell({
      locale,
      heading: isArabic ? "شكراً لطلبك من Velora." : "Thank you for your Velora order.",
      body: isArabic
        ? `تم تأكيد طلبك <strong>${orderNumber}</strong> وسينتقل إلى مرحلة التجهيز قريباً. ينطبق التوصيل المجاني داخل الإمارات على الطلبات المؤهلة فوق AED 300.`
        : `Your order <strong>${orderNumber}</strong> is confirmed and will move to fulfillment shortly. Free UAE delivery applies to eligible orders above AED 300.`,
      ctaLabel: isArabic ? "عرض الطلب" : "View order",
      ctaHref: localizedSiteUrl(`/account/orders/${encodeURIComponent(orderNumber)}`, locale),
    }),
  };
}
