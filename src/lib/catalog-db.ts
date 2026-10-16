import "server-only";

import { CollectionStatus, Prisma, ProductStatus } from "@prisma/client";
import { prisma } from "./prisma";
import { publishDueScheduledCollections, publishDueScheduledHomepageSections, publishDueScheduledProducts } from "./scheduled-publishing";
import { categoryDescriptions, collections as fallbackCollections, products as fallbackProducts, type Category, type Collection, type Product, type ProductMedia } from "./catalog";
import { normalizeCatalogAttribute, uniqueCatalogAttributes } from "./catalog-attributes";
import { buildPublishedReviewPresentation } from "./review-presentation";
import type { Locale } from "./i18n";
import {
  parseHomepageSettings,
  parseStorefrontCategoryMediaItems,
  type StorefrontHomepageSection,
} from "./homepage-sections";
import { parseFilterSettings } from "./filter-settings";
export type { StorefrontHomepageMediaItem, StorefrontHomepageSection } from "./homepage-sections";

const productInclude = {
  category: { include: { translations: true } },
  collections: { where: { status: CollectionStatus.PUBLISHED }, include: { translations: true } },
  collectionSettings: {
    include: { collection: { select: { slug: true, status: true } } },
  },
  tags: true,
  reviews: {
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      rating: true,
      title: true,
      body: true,
      createdAt: true,
      verifiedPurchase: true,
      adminResponse: true,
      respondedAt: true,
      user: { select: { name: true } },
      media: { orderBy: { createdAt: "asc" }, select: { id: true, status: true, altText: true } },
    },
  },
  images: { orderBy: { position: "asc" } },
  translations: true,
  variants: {
    orderBy: [{ color: { name: "asc" } }, { size: { name: "asc" } }],
    include: {
      color: true,
      size: true,
      medias: { orderBy: { sortOrder: "asc" } },
    },
  },
} satisfies Prisma.ProductInclude;

type ProductWithRelations = Prisma.ProductGetPayload<{ include: typeof productInclude }>;
type MediaMetadataByUrl = Map<string, { width?: number; height?: number; altText?: string; focalPointX?: number; focalPointY?: number }>;

function findTranslation<T extends { locale: string }>(translations: T[], locale: Locale) {
  return locale === "en" ? undefined : translations.find((translation) => translation.locale === locale);
}

function parseStringArray(value: string | null | undefined) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
  } catch {
    return [];
  }
}

function isVideoUrl(url: string) {
  return /\.(mp4|webm)(\?.*)?$/i.test(url.trim());
}

const fallbackHomepageSections: StorefrontHomepageSection[] = [
  {
    id: "fallback-hero",
    key: "hero-drop",
    type: "HERO",
    status: "PUBLISHED",
    title: "Move through every part of your day",
    subtitle: "New season",
    body: "Sculpting support, breathable layers, and everyday essentials made for training, Pilates, tennis, and the hours in between.",
    ctaLabel: "Shop now",
    ctaHref: "/shop",
    imageUrl: "/images/campaign/hero-courtyard.webp",
    productIds: [],
    settings: {},
    categoryMediaItems: [],
  },
  {
    id: "fallback-best-sellers",
    key: "best-sellers",
    type: "FEATURED_PRODUCTS",
    status: "PUBLISHED",
    title: "Pieces selling now",
    subtitle: "Best sellers",
    body: "Customer favorites with quick size add, wishlist, sale states, color counts, and persistent cart feedback.",
    ctaLabel: "Shop best sellers",
    ctaHref: "/shop",
    productIds: [],
    settings: {},
    categoryMediaItems: [],
  },
  {
    id: "fallback-collections",
    key: "collection-story",
    type: "COLLECTION_STORY",
    status: "PUBLISHED",
    title: "Collection stories",
    subtitle: "Editorial edits",
    productIds: [],
    settings: {},
    categoryMediaItems: [],
  },
  {
    id: "fallback-latest",
    key: "latest-edit",
    type: "PRODUCT_GRID",
    status: "PUBLISHED",
    title: "The latest edit",
    subtitle: "New and limited",
    ctaLabel: "Shop all",
    ctaHref: "/shop",
    productIds: [],
    settings: {},
    categoryMediaItems: [],
  },
  {
    id: "fallback-fit",
    key: "fit-system",
    type: "STORY_BAND",
    status: "PUBLISHED",
    title: "Choose by silhouette, fabric, and finish.",
    subtitle: "Fit notes",
    body: "Compare drape, structure, stretch, and coverage before choosing your next Velora piece.",
    ctaLabel: "Open fit guide",
    ctaHref: "/fabric-guide",
    imageUrl: "/images/campaign/campaign-sage-portrait.webp",
    productIds: [],
    settings: {},
    categoryMediaItems: [],
  },
];

async function getProductRows() {
  await Promise.all([publishDueScheduledProducts(), publishDueScheduledCollections()]);

  return prisma.product.findMany({
    where: { status: ProductStatus.PUBLISHED },
    orderBy: { createdAt: "desc" },
    include: productInclude,
  });
}

function decimalToNumber(value: { toNumber?: () => number } | number | null | undefined) {
  if (typeof value === "number") return value;
  return value?.toNumber?.();
}

async function getMediaMetadataForRows(rows: ProductWithRelations[]): Promise<MediaMetadataByUrl> {
  const urls = Array.from(
    new Set([
      ...rows.flatMap((row) => row.images.map((image) => image.url)),
      ...rows.flatMap((row) => row.variants.flatMap((variant) => variant.medias.map((media) => media.url))),
    ]),
  );
  if (!urls.length) return new Map();

  const assets = await prisma.mediaAsset.findMany({
    where: { url: { in: urls } },
    select: { url: true, width: true, height: true, altText: true, focalPointX: true, focalPointY: true },
  });

  return new Map(
    assets.map((asset) => [
      asset.url,
      {
        width: asset.width ?? undefined,
        height: asset.height ?? undefined,
        altText: asset.altText ?? undefined,
        focalPointX: asset.focalPointX,
        focalPointY: asset.focalPointY,
      },
    ]),
  );
}

function mapMedia(media: ProductWithRelations["variants"][number]["medias"][number], mediaMetadata: MediaMetadataByUrl): ProductMedia {
  const metadata = mediaMetadata.get(media.url);
  return {
    type: media.type,
    url: media.url,
    sortOrder: media.sortOrder,
    isHoverImage: media.isHoverImage,
    width: metadata?.width,
    height: metadata?.height,
    altText: metadata?.altText,
    focalPointX: metadata?.focalPointX,
    focalPointY: metadata?.focalPointY,
  };
}

function mapProduct(row: ProductWithRelations, mediaMetadata: MediaMetadataByUrl = new Map(), locale: Locale = "en"): Product {
  const translation = findTranslation(row.translations, locale);
  const categoryTranslation = findTranslation(row.category.translations, locale);
  const displayColorName = (name: string) => normalizeCatalogAttribute(name, "One Color") ?? "One Color";
  const displaySizeName = (name: string) => normalizeCatalogAttribute(name, "One Size") ?? "One Size";
  const colorNames = uniqueCatalogAttributes(row.variants.map((variant) => displayColorName(variant.color.name)));
  const sizeNames = uniqueCatalogAttributes(row.variants.map((variant) => displaySizeName(variant.size.name)));
  const colorHex = Object.fromEntries(row.variants.map((variant) => [displayColorName(variant.color.name), variant.color.hex]));
  const variantMediaByColor = row.variants.reduce<Record<string, ProductMedia[]>>((map, variant) => {
    const colorName = displayColorName(variant.color.name);
    const existing = map[colorName] ?? [];
    const existingKeys = new Set(existing.map((media) => `${media.type}:${media.url}:${media.sortOrder}:${media.isHoverImage}`));
    const merged = [...existing];

    for (const media of variant.medias.map((item) => mapMedia(item, mediaMetadata))) {
      const key = `${media.type}:${media.url}:${media.sortOrder}:${media.isHoverImage}`;
      if (!existingKeys.has(key)) {
        existingKeys.add(key);
        merged.push(media);
      }
    }

    map[colorName] = merged.sort((a, b) => a.sortOrder - b.sortOrder);
    return map;
  }, {});
  const productImages = row.images.map((image) => image.url).filter((url) => !isVideoUrl(url));
  const firstColorMedia = colorNames[0] ? variantMediaByColor[colorNames[0]] ?? [] : [];
  const mediaImages = firstColorMedia.filter((media) => media.type === "IMAGE").map((media) => media.url);
  const resolvedImages = mediaImages.length ? mediaImages : productImages;
  const images = resolvedImages.length ? resolvedImages : ["/images/campaign/hero-courtyard.webp"];
  const hoverImage =
    firstColorMedia.find((media) => media.isHoverImage && media.type === "IMAGE")?.url ??
    images[1] ??
    images[0];
  const collectionSlugs = row.collections.map((collection) => collection.slug);
  const collectionMerchandising = Object.fromEntries(
    row.collectionSettings
      .filter((setting) => setting.collection.status === CollectionStatus.PUBLISHED)
      .map((setting) => [
        setting.collection.slug,
        {
          sortOrder: setting.sortOrder,
          pinned: setting.pinned,
        },
      ]),
  );
  const reviewPresentation = buildPublishedReviewPresentation(row.reviews);

  return {
    id: row.id,
    sku: row.sku,
    slug: row.slug,
    name: translation?.title || row.title,
    category: categoryTranslation?.name || row.category.name,
    collection: collectionSlugs[0] ?? "",
    collections: collectionSlugs,
    collectionMerchandising,
    collectionDetails: row.collections.map((collection) => ({
      slug: collection.slug,
      name: findTranslation(collection.translations, locale)?.name || collection.name,
      summary: findTranslation(collection.translations, locale)?.summary || collection.summary,
      image: collection.bannerImage ?? images[0] ?? "/images/campaign/hero-courtyard.webp",
      seoTitle: findTranslation(collection.translations, locale)?.seoTitle ?? collection.seoTitle ?? undefined,
      seoDescription: findTranslation(collection.translations, locale)?.seoDescription ?? collection.seoDescription ?? undefined,
      socialImage: collection.socialImage ?? undefined,
    })),
    price: decimalToNumber(row.price) ?? 0,
    salePrice: decimalToNumber(row.salePrice) ?? undefined,
    rating: reviewPresentation.rating,
    reviews: reviewPresentation.count,
    reviewItems: reviewPresentation.items,
    tags: row.tags.map((tag) => tag.name),
    stock: row.variants.reduce((sum, variant) => sum + variant.stock, 0),
    colors: colorNames,
    sizes: sizeNames,
    badge: row.bestSeller ? "Best seller" : row.newArrival ? "New" : undefined,
    featured: row.featured,
    bestSeller: row.bestSeller,
    newArrival: row.newArrival,
    images,
    hoverImage,
    colorHex,
    variantMediaByColor,
    variants: row.variants.map((variant) => ({
      id: variant.id,
      sku: variant.sku ?? undefined,
      stock: Math.max(0, variant.stock - variant.reservedStock),
      reservedStock: variant.reservedStock,
      lowStockThreshold: variant.lowStockThreshold,
      allowBackorder: variant.allowBackorder,
      backorderLimit: variant.backorderLimit ?? undefined,
      backorderAvailable:
        variant.allowBackorder && variant.backorderLimit != null
          ? Math.max(0, variant.stock + variant.backorderLimit - variant.reservedStock)
          : undefined,
      backorderShipsAt: variant.backorderShipsAt?.toISOString() ?? undefined,
      backorderMessage: variant.backorderMessage ?? undefined,
      color: {
        id: variant.color.id,
        name: displayColorName(variant.color.name),
        hex: variant.color.hex,
      },
      size: {
        id: variant.size.id,
        name: displaySizeName(variant.size.name),
      },
      media: variant.medias.map((media) => mapMedia(media, mediaMetadata)),
    })),
    description: translation?.description || row.description || "",
    fabric: translation?.fabricDetails || row.fabricDetails || "",
    care: translation?.careInstructions || row.careInstructions || "",
    fitSummary: translation?.fitSummary || row.fitSummary || undefined,
    modelReference: translation?.modelReference || row.modelReference || undefined,
    sizeAdvice: translation?.sizeAdvice || row.sizeAdvice || undefined,
    dimensionNotes: parseStringArray(translation?.dimensionNotes || row.dimensionNotes),
    seoTitle: translation?.seoTitle ?? row.seoTitle ?? undefined,
    seoDescription: translation?.seoDescription ?? row.seoDescription ?? undefined,
    socialImage: row.socialImage ?? undefined,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getDbProducts(locale: Locale = "en"): Promise<Product[]> {
  try {
    const rows = await getProductRows();
    const mediaMetadata = await getMediaMetadataForRows(rows);
    return rows.length ? rows.map((row) => mapProduct(row, mediaMetadata, locale)) : fallbackProducts;
  } catch {
    return fallbackProducts;
  }
}

export async function getDbRecommendationProducts(locale: Locale = "en", limit = 12): Promise<Product[]> {
  try {
    await Promise.all([publishDueScheduledProducts(), publishDueScheduledCollections()]);
    const rows = await prisma.product.findMany({
      where: { status: ProductStatus.PUBLISHED },
      orderBy: [{ bestSeller: "desc" }, { newArrival: "desc" }, { createdAt: "desc" }],
      take: Math.max(4, limit),
      include: productInclude,
    });
    const mediaMetadata = await getMediaMetadataForRows(rows);
    return rows.length ? rows.map((row) => mapProduct(row, mediaMetadata, locale)) : fallbackProducts.slice(0, limit);
  } catch {
    return fallbackProducts.slice(0, limit);
  }
}

export async function getDbProduct(slug: string, locale: Locale = "en"): Promise<Product | undefined> {
  try {
    await Promise.all([publishDueScheduledProducts(), publishDueScheduledCollections()]);
    const row = await prisma.product.findFirst({
      where: { slug, status: ProductStatus.PUBLISHED },
      include: productInclude,
    });
    if (!row) return fallbackProducts.find((product) => product.slug === slug);
    const mediaMetadata = await getMediaMetadataForRows([row]);
    return mapProduct(row, mediaMetadata, locale);
  } catch {
    return fallbackProducts.find((product) => product.slug === slug);
  }
}

export async function getDbProductPreview(id: string): Promise<Product | undefined> {
  try {
    await publishDueScheduledProducts();
    const row = await prisma.product.findUnique({
      where: { id },
      include: productInclude,
    });

    if (!row) return undefined;
    const mediaMetadata = await getMediaMetadataForRows([row]);
    return mapProduct(row, mediaMetadata);
  } catch {
    return undefined;
  }
}

export async function getDbCategories(locale: Locale = "en"): Promise<string[]> {
  return (await getDbCategoryDetails(locale)).map((category) => category.name);
}

export async function getDbCategoryDetails(locale: Locale = "en"): Promise<Category[]> {
  try {
    const rows = await prisma.category.findMany({ orderBy: { name: "asc" }, include: { translations: true } });
    return rows.length
      ? rows.map((category) => {
          const translation = findTranslation(category.translations, locale);
          return {
            slug: category.slug,
            name: translation?.name || category.name,
            description: translation?.description ?? category.description ?? categoryDescriptions[category.name] ?? undefined,
            seoTitle: translation?.seoTitle ?? category.seoTitle ?? undefined,
            seoDescription: translation?.seoDescription ?? category.seoDescription ?? undefined,
            socialImage: category.socialImage ?? undefined,
            filterSettings: parseFilterSettings(category.filterSettings),
          };
        })
      : Array.from(new Set(fallbackProducts.map((product) => product.category))).map((name) => ({
          name,
          slug: name.toLowerCase().replace(/\s+/g, "-"),
          description: categoryDescriptions[name],
        }));
  } catch {
    return Array.from(new Set(fallbackProducts.map((product) => product.category))).map((name) => ({
      name,
      slug: name.toLowerCase().replace(/\s+/g, "-"),
      description: categoryDescriptions[name],
    }));
  }
}

export async function getDbCategory(slug: string, locale: Locale = "en"): Promise<Category | undefined> {
  return (await getDbCategoryDetails(locale)).find((category) => category.slug === slug);
}

export async function getDbCollections(locale: Locale = "en"): Promise<Collection[]> {
  try {
    await publishDueScheduledCollections();

    const rows = await prisma.collection.findMany({
      where: { status: CollectionStatus.PUBLISHED },
      orderBy: { name: "asc" },
      include: { translations: true },
    });
    return rows.length
      ? rows.map((collection) => {
          const translation = findTranslation(collection.translations, locale);
          return {
            slug: collection.slug,
            name: translation?.name || collection.name,
            summary: translation?.summary || collection.summary,
            image: collection.bannerImage ?? "/images/campaign/hero-courtyard.webp",
            status: collection.status,
            scheduledAt: collection.scheduledAt?.toISOString(),
            publishedAt: collection.publishedAt?.toISOString(),
            seoTitle: translation?.seoTitle ?? collection.seoTitle ?? undefined,
            seoDescription: translation?.seoDescription ?? collection.seoDescription ?? undefined,
            socialImage: collection.socialImage ?? undefined,
            filterSettings: parseFilterSettings(collection.filterSettings),
          };
        })
      : fallbackCollections;
  } catch {
    return fallbackCollections;
  }
}

export async function getDbCollection(slug: string, locale: Locale = "en"): Promise<Collection | undefined> {
  const collections = await getDbCollections(locale);
  return collections.find((collection) => collection.slug === slug);
}

export async function getDbHomepageSections(locale: Locale = "en"): Promise<StorefrontHomepageSection[]> {
  try {
    await publishDueScheduledHomepageSections();

    const rows = await prisma.homepageSection.findMany({
      where: { enabled: true, status: "PUBLISHED" },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: {
        translations: true,
        collection: { include: { translations: true } },
        products: { select: { id: true } },
      },
    });

    if (!rows.length) return fallbackHomepageSections;

    return rows.map((section) => {
      const translation = findTranslation(section.translations, locale);
      const collectionTranslation = section.collection ? findTranslation(section.collection.translations, locale) : undefined;
      const settings = parseHomepageSettings(section.settings);
      return {
        id: section.id,
        key: section.key,
        type: section.type,
        status: section.status,
        title: translation?.title || section.title,
        subtitle: translation?.subtitle ?? section.subtitle ?? undefined,
        body: translation?.body ?? section.body ?? undefined,
        ctaLabel: translation?.ctaLabel ?? section.ctaLabel ?? undefined,
        ctaHref: translation?.ctaHref ?? section.ctaHref ?? undefined,
        imageUrl: section.imageUrl ?? undefined,
        mobileImageUrl: section.mobileImageUrl ?? undefined,
        settings,
        categoryMediaItems: parseStorefrontCategoryMediaItems(settings),
        collection: section.collection
          ? {
              slug: section.collection.slug,
              name: collectionTranslation?.name || section.collection.name,
              summary: collectionTranslation?.summary || section.collection.summary,
              image: section.collection.bannerImage ?? section.imageUrl ?? "/images/campaign/hero-courtyard.webp",
              seoTitle: collectionTranslation?.seoTitle ?? section.collection.seoTitle ?? undefined,
              seoDescription: collectionTranslation?.seoDescription ?? section.collection.seoDescription ?? undefined,
            }
          : undefined,
        productIds: section.products.map((product) => product.id),
      };
    });
  } catch {
    return fallbackHomepageSections;
  }
}
