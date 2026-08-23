import { z } from "zod";
import type { Locale } from "./i18n";

const localizedTextSchema = z.object({
  en: z.string().trim().min(1).max(240),
  ar: z.string().trim().min(1).max(240),
});

const linkItemSchema = z.object({
  id: z.string().trim().min(1).max(60),
  label: localizedTextSchema,
  href: z.string().trim().min(1).max(240),
  enabled: z.boolean(),
  sortOrder: z.coerce.number().int().min(0).max(1000),
});

const announcementSchema = z.object({
  id: z.string().trim().min(1).max(60),
  message: localizedTextSchema,
  href: z.string().trim().max(240).optional().default(""),
  enabled: z.boolean(),
  sortOrder: z.coerce.number().int().min(0).max(1000),
});

const footerGroupSchema = z.object({
  id: z.string().trim().min(1).max(60),
  title: localizedTextSchema,
  enabled: z.boolean(),
  sortOrder: z.coerce.number().int().min(0).max(1000),
  links: z.array(linkItemSchema).max(12),
});

export const globalContentSchema = z.object({
  announcementEnabled: z.boolean(),
  announcements: z.array(announcementSchema).max(6),
  primaryNavigation: z.array(linkItemSchema).min(1).max(8),
  serviceLinks: z.array(linkItemSchema).max(8),
  footerGroups: z.array(footerGroupSchema).max(4),
  newsletter: z.object({
    eyebrow: localizedTextSchema,
    headline: localizedTextSchema,
    placeholder: localizedTextSchema,
    enabled: z.boolean(),
  }),
  footer: z.object({
    body: localizedTextSchema,
    location: localizedTextSchema,
    copyright: localizedTextSchema,
  }),
});

export type LocalizedText = z.infer<typeof localizedTextSchema>;
export type GlobalLinkItem = z.infer<typeof linkItemSchema>;
export type GlobalAnnouncement = z.infer<typeof announcementSchema>;
export type GlobalFooterGroup = z.infer<typeof footerGroupSchema>;
export type GlobalContent = z.infer<typeof globalContentSchema>;

export const globalContentSettingsSchema = z.object({
  draft: globalContentSchema,
  published: globalContentSchema,
  publishedAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type GlobalContentSettings = z.infer<typeof globalContentSettingsSchema>;

export const defaultGlobalContent: GlobalContent = {
  announcementEnabled: true,
  announcements: [
    {
      id: "delivery",
      message: {
        en: "Complimentary delivery over AED 300",
        ar: "توصيل مجاني للطلبات فوق 300 درهم",
      },
      href: "/shipping",
      enabled: true,
      sortOrder: 10,
    },
    {
      id: "returns",
      message: {
        en: "Free 14-day returns on eligible full-price pieces",
        ar: "إرجاع مجاني خلال 14 يوماً للقطع المؤهلة بالسعر الكامل",
      },
      href: "/returns",
      enabled: true,
      sortOrder: 20,
    },
    {
      id: "new-arrivals",
      message: {
        en: "New arrivals released weekly",
        ar: "تصاميم جديدة كل أسبوع",
      },
      href: "/shop?sort=latest",
      enabled: true,
      sortOrder: 30,
    },
  ],
  primaryNavigation: [
    {
      id: "new",
      label: { en: "New", ar: "جديد" },
      href: "/shop?sort=latest",
      enabled: true,
      sortOrder: 10,
    },
    {
      id: "shop",
      label: { en: "Shop", ar: "تسوق" },
      href: "/shop",
      enabled: true,
      sortOrder: 20,
    },
    {
      id: "best-sellers",
      label: { en: "Best Sellers", ar: "الأكثر مبيعاً" },
      href: "/shop?sort=featured",
      enabled: true,
      sortOrder: 30,
    },
    {
      id: "fit-guide",
      label: { en: "Fit Guide", ar: "دليل القياس" },
      href: "/fabric-guide",
      enabled: true,
      sortOrder: 40,
    },
    {
      id: "story",
      label: { en: "The Story", ar: "القصة" },
      href: "/story",
      enabled: true,
      sortOrder: 50,
    },
  ],
  serviceLinks: [
    {
      id: "track-order",
      label: { en: "Track an order", ar: "تتبع الطلب" },
      href: "/track-order",
      enabled: true,
      sortOrder: 10,
    },
    {
      id: "returns",
      label: { en: "Returns", ar: "الإرجاع" },
      href: "/returns",
      enabled: true,
      sortOrder: 20,
    },
    {
      id: "shipping",
      label: { en: "Shipping", ar: "الشحن" },
      href: "/shipping",
      enabled: true,
      sortOrder: 30,
    },
    {
      id: "contact",
      label: { en: "Contact", ar: "تواصل معنا" },
      href: "/contact",
      enabled: true,
      sortOrder: 40,
    },
  ],
  footerGroups: [
    {
      id: "services",
      title: { en: "Client services", ar: "خدمة العملاء" },
      enabled: true,
      sortOrder: 10,
      links: [
        { id: "shipping", label: { en: "Shipping", ar: "الشحن" }, href: "/shipping", enabled: true, sortOrder: 10 },
        { id: "returns", label: { en: "Returns", ar: "الإرجاع" }, href: "/returns", enabled: true, sortOrder: 20 },
        { id: "track-order", label: { en: "Track an order", ar: "تتبع الطلب" }, href: "/track-order", enabled: true, sortOrder: 30 },
        { id: "contact", label: { en: "Contact", ar: "تواصل معنا" }, href: "/contact", enabled: true, sortOrder: 40 },
        { id: "size-guide", label: { en: "Size guide", ar: "دليل المقاسات" }, href: "/size-guide", enabled: true, sortOrder: 50 },
        { id: "care-guide", label: { en: "Care guide", ar: "دليل العناية" }, href: "/care-guide", enabled: true, sortOrder: 60 },
      ],
    },
    {
      id: "discover",
      title: { en: "Discover", ar: "اكتشف" },
      enabled: true,
      sortOrder: 20,
      links: [
        { id: "story", label: { en: "The Story", ar: "القصة" }, href: "/story", enabled: true, sortOrder: 10 },
        { id: "fit-guide", label: { en: "Fit Guide", ar: "دليل القياس" }, href: "/fabric-guide", enabled: true, sortOrder: 20 },
        { id: "faqs", label: { en: "FAQs", ar: "الأسئلة الشائعة" }, href: "/faqs", enabled: true, sortOrder: 30 },
      ],
    },
  ],
  newsletter: {
    eyebrow: { en: "Move with us", ar: "تحركي معنا" },
    headline: { en: "New movement, first.", ar: "كوني أول من يكتشف الجديد" },
    placeholder: { en: "Email address", ar: "البريد الإلكتروني" },
    enabled: true,
  },
  footer: {
    body: {
      en: "Premium activewear designed for workouts, studio sessions, active days, and everyday life.",
      ar: "ملابس رياضية فاخرة مصممة للتمارين والاستوديو والأيام النشطة والحياة اليومية.",
    },
    location: {
      en: "Premium activewear · UAE",
      ar: "ملابس رياضية فاخرة · الإمارات",
    },
    copyright: { en: "© 2026 Velora", ar: "© 2026 فيلورا" },
  },
};

export const defaultGlobalContentSettings: GlobalContentSettings = {
  draft: defaultGlobalContent,
  published: defaultGlobalContent,
};

export function localText(text: LocalizedText, locale: Locale) {
  return text[locale] || text.en;
}

export function enabledSorted<T extends { enabled: boolean; sortOrder: number }>(items: T[]) {
  return items.filter((item) => item.enabled).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function parseGlobalContentSettings(value: string | null | undefined): GlobalContentSettings {
  if (!value) return defaultGlobalContentSettings;

  try {
    const parsed = globalContentSettingsSchema.partial().safeParse(JSON.parse(value));
    if (!parsed.success) return defaultGlobalContentSettings;
    const published = parsed.data.published ?? defaultGlobalContent;
    const draft = parsed.data.draft ?? published;
    return {
      draft,
      published,
      publishedAt: parsed.data.publishedAt,
      updatedAt: parsed.data.updatedAt,
    };
  } catch {
    return defaultGlobalContentSettings;
  }
}
