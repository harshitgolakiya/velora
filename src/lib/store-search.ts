import type { Collection, Product } from "./catalog";
import {
  applyProductMerchandising,
  defaultSearchMerchandisingSettings,
  searchQueryVariants,
  type SearchMerchandisingSettings,
} from "./search-merchandising";

export type StoreSearchResults = {
  products: Product[];
  categories: string[];
  collections: Collection[];
  pages: SearchablePage[];
};

export function suggestSearchQuery(
  query: string,
  products: Product[],
  categories: string[],
  collections: Collection[],
) {
  const normalizedQuery = normalize(query);
  if (normalizedQuery.length < 3 || normalizedQuery.includes(" ")) return undefined;
  const candidates = new Set<string>([
    ...categories,
    ...collections.map((collection) => collection.name),
    ...products.flatMap((product) => [product.name, product.category, ...(product.tags ?? []), ...product.colors]),
  ]);
  const ranked = Array.from(candidates)
    .flatMap((candidate) => normalize(candidate).split(" "))
    .filter((candidate) => candidate.length >= 3 && candidate !== normalizedQuery)
    .map((candidate) => ({ candidate, distance: editDistance(normalizedQuery, candidate) }))
    .filter(({ candidate, distance }) => distance <= Math.max(1, Math.floor(candidate.length * 0.3)))
    .sort((a, b) => a.distance - b.distance || a.candidate.localeCompare(b.candidate));
  return ranked[0]?.candidate;
}

export type SearchablePage = {
  title: string;
  href: string;
  category: "Support" | "Editorial" | "Legal";
  excerpt: string;
  keywords: string[];
};

export const searchablePages: SearchablePage[] = [
  {
    title: "Shipping",
    href: "/shipping",
    category: "Support",
    excerpt: "Delivery timings, shipping fees, free delivery threshold, and order dispatch details.",
    keywords: ["delivery", "shipping", "uae", "express", "standard", "courier"],
  },
  {
    title: "Returns",
    href: "/returns",
    category: "Support",
    excerpt: "Return windows, refund handling, exchanges, and full-price order return guidance.",
    keywords: ["returns", "refund", "exchange", "full price", "store credit"],
  },
  {
    title: "Fit Guide",
    href: "/fabric-guide",
    category: "Editorial",
    excerpt: "Fabric, compression, care, and fit guidance for activewear essentials.",
    keywords: ["fit", "fabric", "care", "compression", "size guide", "materials"],
  },
  {
    title: "Size Guide",
    href: "/size-guide",
    category: "Editorial",
    excerpt: "General body measurements and guidance for choosing compression and relaxed fits.",
    keywords: ["size", "measurements", "bust", "waist", "hip", "fit"],
  },
  {
    title: "Care Guide",
    href: "/care-guide",
    category: "Support",
    excerpt: "Washing and drying guidance for technical, stretch, and performance fabrics.",
    keywords: ["care", "wash", "dry", "fabric softener", "laundry"],
  },
  {
    title: "FAQs",
    href: "/faqs",
    category: "Support",
    excerpt: "Answers about guest checkout, account orders, payment, shipping, returns, and care.",
    keywords: ["questions", "help", "checkout", "payment", "account", "support"],
  },
  {
    title: "Contact",
    href: "/contact",
    category: "Support",
    excerpt: "Contact support for order help, product guidance, returns, and partnerships.",
    keywords: ["contact", "support", "help", "order help", "partnerships"],
  },
  {
    title: "The Story",
    href: "/story",
    category: "Editorial",
    excerpt: "Velora brand story, design point of view, and warm-weather activewear philosophy.",
    keywords: ["story", "brand", "velora", "about", "editorial"],
  },
  {
    title: "Privacy",
    href: "/privacy",
    category: "Legal",
    excerpt: "How customer data, account information, order details, and analytics are handled.",
    keywords: ["privacy", "data", "cookies", "analytics", "personal information"],
  },
  {
    title: "Terms",
    href: "/terms",
    category: "Legal",
    excerpt: "Terms for orders, payment, delivery, returns, accounts, and product availability.",
    keywords: ["terms", "conditions", "orders", "payment", "returns"],
  },
];

const arabicPageCopy: Record<string, { title: string; excerpt: string; keywords: string[] }> = {
  "/shipping": { title: "الشحن", excerpt: "مواعيد ورسوم التوصيل داخل الإمارات.", keywords: ["توصيل", "شحن", "الإمارات", "سريع"] },
  "/returns": { title: "الإرجاع", excerpt: "فترة الإرجاع والاسترداد والاستبدال.", keywords: ["إرجاع", "استرداد", "استبدال"] },
  "/fabric-guide": { title: "دليل الخامات", excerpt: "إرشادات الخامات والضغط والعناية والمقاس.", keywords: ["خامة", "قماش", "ضغط", "مقاس"] },
  "/size-guide": { title: "دليل المقاسات", excerpt: "قياسات الجسم واختيار المقاس المناسب.", keywords: ["مقاس", "قياسات", "صدر", "خصر"] },
  "/care-guide": { title: "دليل العناية", excerpt: "غسل وتجفيف الأقمشة الرياضية.", keywords: ["عناية", "غسيل", "تجفيف"] },
  "/faqs": { title: "الأسئلة الشائعة", excerpt: "إجابات عن الدفع والشحن والإرجاع والحساب.", keywords: ["أسئلة", "مساعدة", "دفع", "حساب"] },
  "/contact": { title: "تواصلي معنا", excerpt: "مساعدة في الطلبات والمنتجات والإرجاع.", keywords: ["تواصل", "دعم", "مساعدة"] },
  "/story": { title: "قصتنا", excerpt: "قصة Velora وفلسفة تصميم الملابس الرياضية.", keywords: ["قصة", "فيلورا", "عن العلامة"] },
  "/privacy": { title: "الخصوصية", excerpt: "كيفية التعامل مع بياناتك ومعلومات حسابك.", keywords: ["خصوصية", "بيانات", "معلومات"] },
  "/terms": { title: "الشروط", excerpt: "شروط الطلب والدفع والتوصيل والإرجاع.", keywords: ["شروط", "طلب", "دفع"] },
};

export function localizedSearchablePages(locale: "en" | "ar") {
  if (locale === "en") return searchablePages;
  return searchablePages.map((page) => ({ ...page, ...(arabicPageCopy[page.href] ?? {}) }));
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function editDistance(a: string, b: string) {
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let row = 1; row <= a.length; row += 1) {
    let diagonal = previous[0];
    previous[0] = row;
    for (let column = 1; column <= b.length; column += 1) {
      const above = previous[column];
      previous[column] = Math.min(
        previous[column] + 1,
        previous[column - 1] + 1,
        diagonal + (a[row - 1] === b[column - 1] ? 0 : 1),
      );
      diagonal = above;
    }
  }
  return previous[b.length];
}

function tokenScore(queryToken: string, candidateToken: string) {
  if (candidateToken === queryToken) return 12;
  if (candidateToken.startsWith(queryToken)) return 8;
  if (candidateToken.includes(queryToken)) return 5;
  if (queryToken.length >= 4 && editDistance(queryToken, candidateToken) <= 1) return 2;
  return 0;
}

function scoreText(query: string, fields: Array<{ value?: string; weight: number }>) {
  const queryTokens = normalize(query).split(" ").filter(Boolean);
  if (!queryTokens.length) return 0;

  return queryTokens.reduce((total, queryToken) => {
    const best = Math.max(
      ...fields.map(({ value, weight }) => {
        const candidateTokens = normalize(value ?? "").split(" ").filter(Boolean);
        return Math.max(0, ...candidateTokens.map((candidate) => tokenScore(queryToken, candidate) * weight));
      }),
    );
    return best > 0 ? total + best : Number.NEGATIVE_INFINITY;
  }, 0);
}

export function searchStore(
  query: string,
  products: Product[],
  categories: string[],
  collections: Collection[],
  pages: SearchablePage[] = searchablePages,
  merchandisingSettings: SearchMerchandisingSettings = defaultSearchMerchandisingSettings,
): StoreSearchResults {
  const trimmed = query.trim();
  if (!trimmed) {
    const featured = products.filter((product) => product.bestSeller || product.newArrival);
    return {
      products: (featured.length ? featured : products).slice(0, 6),
      categories: categories.slice(0, 5),
      collections: collections.slice(0, 4),
      pages: pages.slice(0, 4),
    };
  }

  const queryVariants = searchQueryVariants(trimmed, merchandisingSettings);
  const bestScore = (fields: Array<{ value?: string; weight: number }>) =>
    Math.max(...queryVariants.map((variant) => scoreText(variant, fields)));

  const rankedProducts = applyProductMerchandising(
    trimmed,
    products
    .map((product) => ({
      product,
      score: bestScore([
        { value: product.name, weight: 5 },
        { value: product.category, weight: 4 },
        { value: product.tags?.join(" "), weight: 3 },
        { value: product.colors.join(" "), weight: 2 },
        { value: product.collections?.join(" "), weight: 2 },
        { value: product.description, weight: 1 },
        { value: product.sku, weight: 2 },
      ]),
    }))
    .filter((entry) => Number.isFinite(entry.score) && entry.score > 0),
    products,
    merchandisingSettings,
  );

  const rankedCategories = categories
    .map((category) => ({ category, score: bestScore([{ value: category, weight: 5 }]) }))
    .filter((entry) => Number.isFinite(entry.score) && entry.score > 0)
    .sort((a, b) => b.score - a.score || a.category.localeCompare(b.category));

  const rankedCollections = collections
    .map((collection) => ({
      collection,
      score: bestScore([
        { value: collection.name, weight: 5 },
        { value: collection.summary, weight: 2 },
      ]),
    }))
    .filter((entry) => Number.isFinite(entry.score) && entry.score > 0)
    .sort((a, b) => b.score - a.score || a.collection.name.localeCompare(b.collection.name));

  const rankedPages = pages
    .map((page) => ({
      page,
      score: bestScore([
        { value: page.title, weight: 5 },
        { value: page.category, weight: 3 },
        { value: page.keywords.join(" "), weight: 3 },
        { value: page.excerpt, weight: 2 },
      ]),
    }))
    .filter((entry) => Number.isFinite(entry.score) && entry.score > 0)
    .sort((a, b) => b.score - a.score || a.page.title.localeCompare(b.page.title));

  return {
    products: rankedProducts.map((entry) => entry.product),
    categories: rankedCategories.map((entry) => entry.category),
    collections: rankedCollections.map((entry) => entry.collection),
    pages: rankedPages.map((entry) => entry.page),
  };
}
