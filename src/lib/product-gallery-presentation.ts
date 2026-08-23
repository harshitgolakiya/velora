import type { Product, ProductMedia } from "./catalog";

export type GalleryPresentationMedia = Pick<ProductMedia, "type" | "url" | "width" | "height" | "altText" | "focalPointX" | "focalPointY">;

function orderImagesBeforeVideo(media: GalleryPresentationMedia[]) {
  return [...media].sort((first, second) => {
    if (first.type === second.type) return 0;
    return first.type === "IMAGE" ? -1 : 1;
  });
}

export function resolveProductGalleryMedia(
  product: Pick<Product, "images" | "variantMediaByColor">,
  selectedColor?: string,
): GalleryPresentationMedia[] {
  const colorMedia = selectedColor ? product.variantMediaByColor?.[selectedColor] : undefined;
  if (colorMedia?.length) {
    return orderImagesBeforeVideo(
      colorMedia.map(({ type, url, width, height, altText, focalPointX, focalPointY }) => ({
        type,
        url,
        width,
        height,
        altText,
        focalPointX,
        focalPointY,
      })),
    );
  }
  return product.images.map((url) => ({ type: "IMAGE" as const, url }));
}

export function focalObjectPosition(media: GalleryPresentationMedia | undefined) {
  if (!media || typeof media.focalPointX !== "number" || typeof media.focalPointY !== "number") return "50% 50%";
  return `${Math.round(media.focalPointX * 100)}% ${Math.round(media.focalPointY * 100)}%`;
}

export function canZoomSource(media: GalleryPresentationMedia | undefined, minimumWidth = 1200) {
  if (!media || media.type !== "IMAGE") return false;
  return !media.width || media.width >= minimumWidth;
}

export function galleryViewerWidth(media: GalleryPresentationMedia | undefined, zoomed: boolean) {
  if (!media || media.type !== "IMAGE") return "100%";
  if (!media.width) return zoomed ? "150vw" : "100%";
  return zoomed && canZoomSource(media) ? `${media.width}px` : `min(100vw, ${media.width}px)`;
}

export function sourceResolutionLabel(media: GalleryPresentationMedia | undefined) {
  if (!media || media.type !== "IMAGE" || !media.width) return null;
  return `Showing at source size: ${media.width} x ${media.height ?? "auto"} px`;
}
