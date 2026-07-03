import "server-only";

import { deliverEmail } from "./email-delivery";
import { normalizeEmailLocale, transactionalEmailShell } from "./transactional-email";

export function sendVerificationEmail(recipient: string, actionUrl: string, locale?: string | null) {
  const isArabic = normalizeEmailLocale(locale) === "ar";
  return deliverEmail({
    recipient,
    subject: isArabic ? "تأكيد بريدك الإلكتروني" : "Verify your email address",
    sourceKey: `email-verification:${recipient}`,
    metadata: { type: "EMAIL_VERIFICATION", locale: normalizeEmailLocale(locale) },
    html: transactionalEmailShell({
      locale,
      heading: isArabic ? "تأكيد البريد الإلكتروني" : "Verify your email",
      body: isArabic ? "أكد بريدك الإلكتروني لتفعيل حسابك. ينتهي هذا الرابط خلال 24 ساعة." : "Confirm your email address to activate your customer account. This link expires in 24 hours.",
      ctaLabel: isArabic ? "تأكيد البريد" : "Verify email",
      ctaHref: actionUrl,
      note: isArabic ? "إذا لم تطلب ذلك، يمكنك تجاهل هذه الرسالة بأمان." : "If you did not request this, you can safely ignore this email.",
    }),
  });
}

export function sendPasswordResetEmail(recipient: string, actionUrl: string, locale?: string | null) {
  const isArabic = normalizeEmailLocale(locale) === "ar";
  return deliverEmail({
    recipient,
    subject: isArabic ? "إعادة تعيين كلمة المرور" : "Reset your password",
    sourceKey: `password-reset:${recipient}`,
    metadata: { type: "PASSWORD_RESET", locale: normalizeEmailLocale(locale) },
    html: transactionalEmailShell({
      locale,
      heading: isArabic ? "إعادة تعيين كلمة المرور" : "Reset your password",
      body: isArabic ? "استخدم الرابط الآمن لاختيار كلمة مرور جديدة. ينتهي الرابط خلال ساعة ويمكن استخدامه مرة واحدة فقط." : "Use the secure link below to choose a new password. This link expires in one hour and can only be used once.",
      ctaLabel: isArabic ? "إعادة التعيين" : "Reset password",
      ctaHref: actionUrl,
      note: isArabic ? "إذا لم تطلب ذلك، يمكنك تجاهل هذه الرسالة بأمان." : "If you did not request this, you can safely ignore this email.",
    }),
  });
}
