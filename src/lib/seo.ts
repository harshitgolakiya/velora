import type { Product, Collection } from "./catalog";
import { localizedPath, stripLocale } from "./i18n";

export function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "https://velora.ae").replace(/\/$/, "");
}

export function absoluteUrl(path = "/") {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${siteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

export function localizedAlternates(path = "/") {
  const canonical = stripLocale(path);

  return {
    canonical,
    languages: {
      en: canonical,
      ar: localizedPath(canonical, "ar"),
      "x-default": canonical,
    },
  };
}

export function primaryImage(images?: string[]) {
  return images?.find(Boolean) ?? "/images/campaign/hero-courtyard.webp";
}

export function productJsonLd(product: Product) {
  const price = product.salePrice ?? product.price;
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: product.images.map(absoluteUrl),
    description: product.description,
    brand: { "@type": "Brand", name: "Velora" },
    sku: product.sku,
    category: product.category,
    aggregateRating: product.reviews > 0 ? {
      "@type": "AggregateRating",
      ratingValue: product.rating,
      reviewCount: product.reviews,
    } : undefined,
    offers: product.variants?.length
      ? product.variants.map((variant) => ({
          "@type": "Offer",
          sku: variant.sku,
          priceCurrency: "AED",
          price,
          itemCondition: "https://schema.org/NewCondition",
          availability:
            variant.stock > 0
              ? "https://schema.org/InStock"
              : variant.allowBackorder
                ? "https://schema.org/BackOrder"
                : "https://schema.org/OutOfStock",
          url: absoluteUrl(`/product/${product.slug}?color=${encodeURIComponent(variant.color.name)}&size=${encodeURIComponent(variant.size.name)}`),
        }))
      : {
          "@type": "Offer",
          priceCurrency: "AED",
          price,
          itemCondition: "https://schema.org/NewCondition",
          availability: product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
          url: absoluteUrl(`/product/${product.slug}`),
        },
  };
}

export function collectionJsonLd(collection: Collection, productCount: number) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: collection.name,
    description: collection.summary,
    url: absoluteUrl(`/collections/${collection.slug}`),
    image: collection.image ? absoluteUrl(collection.image) : undefined,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: productCount,
      name: `${collection.name} products`,
    },
  };
}

export function faqJsonLd(items: Array<{ question: string; answer: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Velora",
    url: siteUrl(),
    logo: absoluteUrl("/images/campaign/hero-courtyard.webp"),
    sameAs: [],
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Velora",
    url: siteUrl(),
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteUrl()}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}
