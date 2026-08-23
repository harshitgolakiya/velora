import { isVideoUrl } from "./admin-validation";

type HomepagePublicationInput = {
  status: string;
  settings?: Record<string, unknown>;
};

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function getHomepagePublicationError(input: HomepagePublicationInput) {
  if (input.status !== "PUBLISHED" && input.status !== "SCHEDULED") return null;

  const rawMediaItems = input.settings?.categoryMediaItems;
  if (!Array.isArray(rawMediaItems) || rawMediaItems.length === 0) return null;

  for (const [index, rawItem] of rawMediaItems.entries()) {
    if (!rawItem || typeof rawItem !== "object") {
      return `Category media tile ${index + 1} is incomplete.`;
    }

    const item = rawItem as Record<string, unknown>;
    const title = stringValue(item.title);
    const href = stringValue(item.href);
    const mediaType = stringValue(item.mediaType) || "IMAGE";
    const imageUrl = stringValue(item.imageUrl);
    const videoUrl = stringValue(item.videoUrl);
    const cloudflareStreamId = stringValue(item.cloudflareStreamId);
    const posterUrl = stringValue(item.posterUrl);

    if (!title || !href) {
      return `Category media tile ${index + 1} needs a title and link before publishing.`;
    }

    if (mediaType === "CLOUDFLARE_STREAM" && !cloudflareStreamId) {
      return `Category media tile ${index + 1} needs a Cloudflare Stream ID before publishing.`;
    }

    if (mediaType === "VIDEO") {
      if (!videoUrl) {
        return `Category media tile ${index + 1} needs a video file before publishing.`;
      }
      if (!isVideoUrl(videoUrl)) {
        return `Category media tile ${index + 1} needs an HTTPS or local .mp4/.webm video URL before publishing.`;
      }
    }

    if (mediaType !== "VIDEO" && mediaType !== "CLOUDFLARE_STREAM" && !imageUrl && !posterUrl) {
      return `Category media tile ${index + 1} needs an image before publishing.`;
    }
  }

  return null;
}
