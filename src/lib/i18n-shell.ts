export const locales = ["en", "ar"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export function localeFromPathname(pathname: string): Locale {
  return pathname === "/ar" || pathname.startsWith("/ar/") ? "ar" : "en";
}

export function stripLocale(pathname: string) {
  if (pathname === "/ar") return "/";
  if (pathname.startsWith("/ar/")) return pathname.slice(3) || "/";
  return pathname || "/";
}

export function localizedPath(pathname: string, locale: Locale) {
  const path = stripLocale(pathname);
  if (locale === defaultLocale) return path;
  return path === "/" ? `/${locale}` : `/${locale}${path}`;
}

export function dirForLocale(locale: Locale) {
  return locale === "ar" ? "rtl" : "ltr";
}

const categoryLabels: Record<Locale, Record<string, string>> = {
  en: {},
  ar: {
    Leggings: "ليقنز",
    "Sports Bras": "حمالات رياضية",
    Jackets: "جاكيتات",
    Tops: "توبات",
    Pants: "بناطيل",
    Accessories: "إكسسوارات",
  },
};

export function categoryLabel(locale: Locale, category: string) {
  return categoryLabels[locale][category] ?? category;
}

const collectionLabels: Record<Locale, Record<string, string>> = {
  en: {},
  ar: {
    "studio-sculpt": "ستوديو سكلبت",
    "desert-run": "ديزرت ران",
    "after-hours": "آفتر آورز",
  },
};

export function collectionLabel(locale: Locale, slug: string, fallbackName: string) {
  return collectionLabels[locale][slug] ?? fallbackName;
}

export const shellCopy = {
  en: {
    new: "New",
    shop: "Shop",
    bestSellers: "Best Sellers",
    fitGuide: "Fit Guide",
    story: "The Story",
    categories: "Categories",
    collections: "Collections",
    shopAll: "Shop all",
    account: "Account",
    wishlist: "Wishlist",
    theme: "Theme",
    language: "Language",
    languageName: "English",
    clientServices: "Client services",
    discover: "Discover",
    shipping: "Shipping",
    returns: "Returns",
    trackOrder: "Track an order",
    contact: "Contact",
    sizeGuide: "Size guide",
    careGuide: "Care guide",
    privateAccess: "Private access",
    footerHeadline: "The next movement, first.",
    footerBody: "Activewear designed with restraint, engineered for movement, and considered for warm-weather city life.",
    newsletterPlaceholder: "Email address",
    announcement: [
      "Complimentary standard delivery over AED 300",
      "Free 14-day returns on full-price items",
      "New arrivals dropping weekly",
    ],
    secureCheckout: "Secure checkout",
    secure: "Secure",
    search: "Search",
    cart: "Cart",
    details: "Details",
    payment: "Payment",
    faqs: "FAQs",
    bestsellerEdit: "Bestseller edit",
    joinNewsletter: "Join newsletter",
    location: "International warm-weather activewear",
    privacy: "Privacy",
    terms: "Terms",
    copyright: "© 2026 Velora",
  },
  ar: {
    new: "جديد",
    shop: "تسوق",
    bestSellers: "الأكثر مبيعاً",
    fitGuide: "دليل القياس",
    story: "القصة",
    categories: "الفئات",
    collections: "المجموعات",
    shopAll: "تسوق الكل",
    account: "الحساب",
    wishlist: "المفضلة",
    theme: "المظهر",
    language: "اللغة",
    languageName: "العربية",
    clientServices: "خدمة العملاء",
    discover: "اكتشف",
    shipping: "الشحن",
    returns: "الإرجاع",
    trackOrder: "تتبع الطلب",
    contact: "تواصل معنا",
    sizeGuide: "دليل المقاسات",
    careGuide: "دليل العناية",
    privateAccess: "وصول خاص",
    footerHeadline: "الحركة القادمة أولاً.",
    footerBody: "ملابس أداء مصممة بهدوء ودقة للحركة والحياة في المدن الدافئة.",
    newsletterPlaceholder: "البريد الإلكتروني",
    announcement: [
      "توصيل قياسي مجاني للطلبات فوق 300 درهم",
      "إرجاع مجاني خلال 14 يوماً للقطع بالسعر الكامل",
      "تصاميم جديدة كل أسبوع",
    ],
    secureCheckout: "دفع آمن",
    secure: "آمن",
    search: "بحث",
    cart: "السلة",
    details: "التفاصيل",
    payment: "الدفع",
    faqs: "الأسئلة الشائعة",
    bestsellerEdit: "من الأكثر مبيعاً",
    joinNewsletter: "انضم للنشرة البريدية",
    location: "ملابس أداء عالمية للمناخ الدافئ",
    privacy: "الخصوصية",
    terms: "الشروط",
    copyright: "© 2026 فيلورا",
  },
} satisfies Record<Locale, Record<string, string | string[]>>;
