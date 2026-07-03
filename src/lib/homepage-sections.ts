import type { Collection } from "./catalog";

export type StorefrontHomepageSection = {
  id: string;
  key: string;
  type:
    | "HERO"
    | "FEATURED_PRODUCTS"
    | "COLLECTION_STORY"
    | "PRODUCT_GRID"
    | "STORY_BAND"
    | "NEWSLETTER"
    | "CUSTOM";
  status: "DRAFT" | "SCHEDULED" | "PUBLISHED";
  title: string;
  subtitle?: string;
  body?: string;
  ctaLabel?: string;
  ctaHref?: string;
  imageUrl?: string;
  mobileImageUrl?: string;
  settings: Record<string, unknown>;
  categoryMediaItems: StorefrontHomepageMediaItem[];
  collection?: Collection;
  productIds: string[];
};

export type StorefrontHomepageMediaItem = {
  id: string;
  title: string;
  href: string;
  mediaType: "IMAGE" | "VIDEO" | "CLOUDFLARE_STREAM";
  imageUrl?: string;
  videoUrl?: string;
  cloudflareStreamId?: string;
  posterUrl?: string;
};

export function isPublicHomepageSection(input: { enabled: boolean; status: string }) {
  return input.enabled && input.status === "PUBLISHED";
}

export function parseHomepageSettings(value: string | null | undefined): Record<string, unknown> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export function parseStorefrontCategoryMediaItems(settings: Record<string, unknown>): StorefrontHomepageMediaItem[] {
  const rawItems = settings.categoryMediaItems;
  if (!Array.isArray(rawItems)) return [];

  return rawItems
    .map((item, index) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const title = typeof row.title === "string" ? row.title.trim() : "";
      const href = typeof row.href === "string" ? row.href.trim() : "";
      const mediaType = row.mediaType === "VIDEO" || row.mediaType === "CLOUDFLARE_STREAM" ? row.mediaType : "IMAGE";
      const imageUrl = typeof row.imageUrl === "string" ? row.imageUrl.trim() : "";
      const videoUrl = typeof row.videoUrl === "string" ? row.videoUrl.trim() : "";
      const cloudflareStreamId = typeof row.cloudflareStreamId === "string" ? row.cloudflareStreamId.trim() : "";
      const posterUrl = typeof row.posterUrl === "string" ? row.posterUrl.trim() : "";

      if (!title || !href) return null;
      if (mediaType === "CLOUDFLARE_STREAM" && !cloudflareStreamId) return null;
      if (mediaType === "VIDEO" && !videoUrl) return null;
      if (mediaType === "IMAGE" && !imageUrl && !posterUrl) return null;

      return {
        id: typeof row.id === "string" && row.id.trim() ? row.id.trim() : `category-media-${index}`,
        title,
        href,
        mediaType,
        imageUrl: imageUrl || undefined,
        videoUrl: videoUrl || undefined,
        cloudflareStreamId: cloudflareStreamId || undefined,
        posterUrl: posterUrl || undefined,
      } satisfies StorefrontHomepageMediaItem;
    })
    .filter(Boolean) as StorefrontHomepageMediaItem[];
}
