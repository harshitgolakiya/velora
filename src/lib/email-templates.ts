import "server-only";

import { prisma } from "./prisma";
import { createNewsletterToken } from "./newsletter-consent";
import { workflowEmailTypes, type WorkflowEmailType } from "./email-template-constants";
import { localizedPath } from "./i18n";
export { emailTemplateVariables, workflowEmailTypes } from "./email-template-constants";

export type WorkflowEmailContext = {
  type: string;
  subject?: string | null;
  orderNumber?: string;
  customerName?: string;
  cartValue?: number;
  productName?: string;
  productSlug?: string;
  marketing?: boolean;
  recipient?: string;
  locale?: string;
};

const siteUrl = () => process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export function fallbackWorkflowEmail(input: WorkflowEmailContext) {
  const name = input.customerName || "there";
  const isArabic = input.locale?.startsWith("ar");
  const content = isArabic
    ? ({
        WELCOME: {
          subject: "مرحبا بك في Velora",
          body: `مرحبا ${name}. اكتشفي قطع activewear فاخرة ومصممة للحركة اليومية.`,
          cta: "تسوقي Velora",
        },
        ABANDONED_CART: {
          subject: "اختياراتك من Velora ما زالت متاحة",
          body: `القطع التي اخترتها ما زالت بانتظارك${input.cartValue ? ` بقيمة AED ${input.cartValue.toFixed(0)}` : ""}. عودي قبل تغير التوفر.`,
          cta: "العودة للتسوق",
        },
        POST_PURCHASE: {
          subject: `كيف كانت تجربتك مع طلب Velora ${input.orderNumber ?? ""}?`,
          body: `نتمنى أن يكون طلبك ${input.orderNumber ?? ""} قد وصل بشكل مثالي. ردي على هذه الرسالة إذا احتجت دعما للمقاس أو العناية.`,
          cta: "تسوقي الجديد",
        },
        REVIEW_REQUEST: {
          subject: `ما رأيك في مقاس ${input.productName ?? "طلبك من Velora"}?`,
          body: `شاركي تجربتك مع ${input.productName ?? "طلبك الاخير"}. تقييمك الموثق يساعد العميلات على الاختيار بثقة.`,
          cta: "اكتبي تقييما",
        },
      }[input.type] ?? {
        subject: "تحديث من Velora",
        body: "يوجد تحديث جديد من Velora.",
        cta: "تسوقي Velora",
      })
    : ({
        WELCOME: {
          subject: "Welcome to Velora",
          body: `Welcome, ${name}. Discover refined activewear designed for everyday movement.`,
          cta: "Shop Velora",
        },
        ABANDONED_CART: {
          subject: "Your Velora edit is still available",
          body: `Your selected pieces are waiting${input.cartValue ? `, valued at AED ${input.cartValue.toFixed(0)}` : ""}. Return before availability changes.`,
          cta: "Shop Velora",
        },
        POST_PURCHASE: {
          subject: `How is your Velora order ${input.orderNumber ?? ""}?`,
          body: `We hope your Velora order ${input.orderNumber ?? ""} arrived perfectly. Reply if you need fit or care support.`,
          cta: "Shop Velora",
        },
        REVIEW_REQUEST: {
          subject: `How does ${input.productName ?? "your Velora order"} fit?`,
          body: `Share your experience with ${input.productName ?? "your recent purchase"}. Your verified review helps other customers choose with confidence.`,
          cta: "Write a review",
        },
      }[input.type] ?? {
        subject: "An update from Velora",
        body: "There is an update waiting for you from Velora.",
        cta: "Shop Velora",
      });

  const preferenceUrl = input.marketing && input.recipient
    ? `${siteUrl()}/email-preferences?token=${encodeURIComponent(createNewsletterToken(input.recipient))}`
    : "";

  return {
    subject: input.subject || content.subject,
    html: `<div dir="${isArabic ? "rtl" : "ltr"}" style="background:#FAF9F6;padding:32px;font-family:Arial,sans-serif;color:#17262D"><div style="max-width:560px;margin:auto;background:#fff;padding:32px"><p style="letter-spacing:.22em;color:#BCE3F4">VELORA</p><h1 style="font-family:Georgia,serif;font-size:32px">${isArabic ? `مرحبا ${name}` : `Hello ${name},`}</h1><p style="line-height:1.7">${content.body}</p><a href="${input.type === "REVIEW_REQUEST" && input.productSlug ? `${siteUrl()}${localizedPath(`/product/${encodeURIComponent(input.productSlug)}#reviews`, isArabic ? "ar" : "en")}` : `${siteUrl()}${localizedPath("/shop", isArabic ? "ar" : "en")}`}" style="display:inline-block;margin-top:18px;background:#17262D;color:#fff;padding:14px 22px;text-decoration:none">${content.cta}</a>${preferenceUrl ? `<p style="margin-top:28px;font-size:12px;color:#666"><a href="${preferenceUrl}" style="color:#666">${isArabic ? "ادارة تفضيلات البريد او الغاء الاشتراك" : "Manage email preferences or unsubscribe"}</a></p>` : ""}</div></div>`,
  };
}

export const defaultEmailTemplates: Record<WorkflowEmailType, { name: string; subject: string; bodyHtml: string }> = {
  WELCOME: {
    name: "Welcome email",
    subject: "Welcome to {{brandName}}",
    bodyHtml: `<div style="background:#FAF9F6;padding:32px;font-family:Arial,sans-serif;color:#17262D"><div style="max-width:560px;margin:auto;background:#fff;padding:32px"><p style="letter-spacing:.22em;color:#BCE3F4">{{brandName}}</p><h1 style="font-family:Georgia,serif;font-size:32px">Hello {{customerName}},</h1><p style="line-height:1.7">Welcome to {{brandName}}. Discover refined activewear designed for everyday movement.</p><a href="{{shopUrl}}" style="display:inline-block;margin-top:18px;background:#17262D;color:#fff;padding:14px 22px;text-decoration:none">Shop Velora</a><p style="margin-top:28px;font-size:12px;color:#666"><a href="{{preferencesUrl}}" style="color:#666">Manage email preferences or unsubscribe</a></p></div></div>`,
  },
  ABANDONED_CART: {
    name: "Abandoned cart recovery",
    subject: "Your {{brandName}} edit is still available",
    bodyHtml: `<div style="background:#FAF9F6;padding:32px;font-family:Arial,sans-serif;color:#17262D"><div style="max-width:560px;margin:auto;background:#fff;padding:32px"><p style="letter-spacing:.22em;color:#BCE3F4">{{brandName}}</p><h1 style="font-family:Georgia,serif;font-size:32px">Still deciding?</h1><p style="line-height:1.7">Your selected pieces are waiting{{cartValue}}. Return before availability changes.</p><a href="{{shopUrl}}" style="display:inline-block;margin-top:18px;background:#17262D;color:#fff;padding:14px 22px;text-decoration:none">Return to shop</a><p style="margin-top:28px;font-size:12px;color:#666"><a href="{{preferencesUrl}}" style="color:#666">Manage email preferences or unsubscribe</a></p></div></div>`,
  },
  POST_PURCHASE: {
    name: "Post-purchase follow-up",
    subject: "How is your {{brandName}} order {{orderNumber}}?",
    bodyHtml: `<div style="background:#FAF9F6;padding:32px;font-family:Arial,sans-serif;color:#17262D"><div style="max-width:560px;margin:auto;background:#fff;padding:32px"><p style="letter-spacing:.22em;color:#BCE3F4">{{brandName}}</p><h1 style="font-family:Georgia,serif;font-size:32px">Hello {{customerName}},</h1><p style="line-height:1.7">We hope your order {{orderNumber}} arrived perfectly. Reply if you need fit or care support.</p><a href="{{shopUrl}}" style="display:inline-block;margin-top:18px;background:#17262D;color:#fff;padding:14px 22px;text-decoration:none">Shop new arrivals</a></div></div>`,
  },
  REVIEW_REQUEST: {
    name: "Verified review request",
    subject: "How does {{productName}} fit?",
    bodyHtml: `<div style="background:#FAF9F6;padding:32px;font-family:Arial,sans-serif;color:#17262D"><div style="max-width:560px;margin:auto;background:#fff;padding:32px"><p style="letter-spacing:.22em;color:#BCE3F4">{{brandName}}</p><h1 style="font-family:Georgia,serif;font-size:32px">Share your fit notes</h1><p style="line-height:1.7">Your verified review of {{productName}} helps other customers choose with confidence.</p><a href="{{reviewUrl}}" style="display:inline-block;margin-top:18px;background:#17262D;color:#fff;padding:14px 22px;text-decoration:none">Write a review</a></div></div>`,
  },
};

export const arabicDefaultEmailTemplates: Record<WorkflowEmailType, { name: string; subject: string; bodyHtml: string }> = {
  WELCOME: {
    name: "رسالة الترحيب",
    subject: "مرحبا بك في {{brandName}}",
    bodyHtml: `<div dir="rtl" style="background:#FAF9F6;padding:32px;font-family:Arial,sans-serif;color:#17262D"><div style="max-width:560px;margin:auto;background:#fff;padding:32px"><p style="letter-spacing:.22em;color:#BCE3F4">{{brandName}}</p><h1 style="font-family:Georgia,serif;font-size:32px">مرحبا {{customerName}}</h1><p style="line-height:1.7">اكتشفي قطع activewear فاخرة ومصممة للحركة اليومية.</p><a href="{{shopUrl}}" style="display:inline-block;margin-top:18px;background:#17262D;color:#fff;padding:14px 22px;text-decoration:none">تسوقي Velora</a><p style="margin-top:28px;font-size:12px;color:#666"><a href="{{preferencesUrl}}" style="color:#666">ادارة تفضيلات البريد او الغاء الاشتراك</a></p></div></div>`,
  },
  ABANDONED_CART: {
    name: "استعادة السلة المتروكة",
    subject: "اختياراتك من {{brandName}} ما زالت متاحة",
    bodyHtml: `<div dir="rtl" style="background:#FAF9F6;padding:32px;font-family:Arial,sans-serif;color:#17262D"><div style="max-width:560px;margin:auto;background:#fff;padding:32px"><p style="letter-spacing:.22em;color:#BCE3F4">{{brandName}}</p><h1 style="font-family:Georgia,serif;font-size:32px">ما زلت تفكرين؟</h1><p style="line-height:1.7">القطع التي اخترتها ما زالت بانتظارك{{cartValue}}. عودي قبل تغير التوفر.</p><a href="{{shopUrl}}" style="display:inline-block;margin-top:18px;background:#17262D;color:#fff;padding:14px 22px;text-decoration:none">العودة للتسوق</a><p style="margin-top:28px;font-size:12px;color:#666"><a href="{{preferencesUrl}}" style="color:#666">ادارة تفضيلات البريد او الغاء الاشتراك</a></p></div></div>`,
  },
  POST_PURCHASE: {
    name: "متابعة ما بعد الشراء",
    subject: "كيف كانت تجربتك مع طلب {{brandName}} {{orderNumber}}?",
    bodyHtml: `<div dir="rtl" style="background:#FAF9F6;padding:32px;font-family:Arial,sans-serif;color:#17262D"><div style="max-width:560px;margin:auto;background:#fff;padding:32px"><p style="letter-spacing:.22em;color:#BCE3F4">{{brandName}}</p><h1 style="font-family:Georgia,serif;font-size:32px">مرحبا {{customerName}}</h1><p style="line-height:1.7">نتمنى أن يكون طلبك {{orderNumber}} قد وصل بشكل مثالي. ردي على هذه الرسالة إذا احتجت دعما للمقاس أو العناية.</p><a href="{{shopUrl}}" style="display:inline-block;margin-top:18px;background:#17262D;color:#fff;padding:14px 22px;text-decoration:none">تسوقي الجديد</a></div></div>`,
  },
  REVIEW_REQUEST: {
    name: "طلب تقييم موثق",
    subject: "ما رأيك في مقاس {{productName}}?",
    bodyHtml: `<div dir="rtl" style="background:#FAF9F6;padding:32px;font-family:Arial,sans-serif;color:#17262D"><div style="max-width:560px;margin:auto;background:#fff;padding:32px"><p style="letter-spacing:.22em;color:#BCE3F4">{{brandName}}</p><h1 style="font-family:Georgia,serif;font-size:32px">شاركي ملاحظات المقاس</h1><p style="line-height:1.7">تقييمك الموثق عن {{productName}} يساعد العميلات على الاختيار بثقة.</p><a href="{{reviewUrl}}" style="display:inline-block;margin-top:18px;background:#17262D;color:#fff;padding:14px 22px;text-decoration:none">اكتبي تقييما</a></div></div>`,
  },
};

export function renderEmailTemplate(template: string, input: WorkflowEmailContext) {
  const preferenceUrl = input.marketing && input.recipient
    ? `${siteUrl()}/email-preferences?token=${encodeURIComponent(createNewsletterToken(input.recipient))}`
    : "";
  const values: Record<string, string> = {
    brandName: "Velora",
    customerName: input.customerName || "there",
    orderNumber: input.orderNumber ?? "",
    cartValue: input.cartValue ? `, valued at AED ${input.cartValue.toFixed(0)}` : "",
    productName: input.productName ?? "your recent purchase",
    shopUrl: `${siteUrl()}${localizedPath("/shop", input.locale?.startsWith("ar") ? "ar" : "en")}`,
    reviewUrl: `${siteUrl()}${localizedPath(input.productSlug ? `/product/${encodeURIComponent(input.productSlug)}#reviews` : "/account/orders", input.locale?.startsWith("ar") ? "ar" : "en")}`,
    preferencesUrl: preferenceUrl,
  };
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key: string) => values[key] ?? "");
}

function defaultTemplatesForLocale(locale: string) {
  return locale.startsWith("ar") ? arabicDefaultEmailTemplates : defaultEmailTemplates;
}

export async function ensureDefaultEmailTemplates(locale = "en") {
  const templates = await Promise.all(
    workflowEmailTypes.map(async (type) => {
      const defaults = defaultTemplatesForLocale(locale)[type];
      return prisma.emailTemplate.upsert({
        where: { type_locale: { type, locale } },
        create: {
          type,
          locale,
          name: defaults.name,
          subject: defaults.subject,
          bodyHtml: defaults.bodyHtml,
          status: "DRAFT",
          createdBy: "system",
          updatedBy: "system",
          versions: {
            create: {
              version: 1,
              subject: defaults.subject,
              bodyHtml: defaults.bodyHtml,
              status: "DRAFT",
              createdBy: "system",
            },
          },
        },
        update: {},
        include: { _count: { select: { versions: true } } },
      });
    }),
  );
  return templates;
}

export async function workflowEmailFromTemplate(input: WorkflowEmailContext) {
  const locale = input.locale ?? "en";
  const template =
    await prisma.emailTemplate.findUnique({
      where: { type_locale: { type: input.type, locale } },
    }) ??
    (locale === "en"
      ? null
      : await prisma.emailTemplate.findUnique({
          where: { type_locale: { type: input.type, locale: "en" } },
        }));
  if (!template || template.status !== "PUBLISHED") return fallbackWorkflowEmail(input);
  return {
    subject: input.subject || renderEmailTemplate(template.subject, input),
    html: renderEmailTemplate(template.bodyHtml, input),
    templateId: template.id,
    templateVersion: template.version,
    locale: template.locale,
  };
}
