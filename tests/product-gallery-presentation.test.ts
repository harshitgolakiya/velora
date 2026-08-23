import { describe, expect, it } from "vitest";
import {
  canZoomSource,
  focalObjectPosition,
  galleryViewerWidth,
  resolveProductGalleryMedia,
  sourceResolutionLabel,
} from "@/lib/product-gallery-presentation";
import type { Product } from "@/lib/catalog";

const product = {
  images: ["/fallback-1.jpg", "/fallback-2.jpg"],
  variantMediaByColor: {
    Black: [
      { type: "IMAGE", url: "/black-1.jpg", sortOrder: 0, isHoverImage: false, width: 1600, height: 2000 },
      { type: "VIDEO", url: "/black-video.mp4", sortOrder: 1, isHoverImage: false },
    ],
    Blue: [
      { type: "VIDEO", url: "/blue-video.mp4", sortOrder: 0, isHoverImage: false },
      { type: "IMAGE", url: "/blue-1.jpg", sortOrder: 1, isHoverImage: false },
      { type: "IMAGE", url: "/blue-2.jpg", sortOrder: 2, isHoverImage: true },
    ],
  },
} as Pick<Product, "images" | "variantMediaByColor">;

describe("product gallery presentation", () => {
  it("uses selected color media when available", () => {
    expect(resolveProductGalleryMedia(product, "Black").map((item) => item.url)).toEqual(["/black-1.jpg", "/black-video.mp4"]);
  });

  it("keeps selected color media isolated and places video after images", () => {
    expect(resolveProductGalleryMedia(product, "Blue").map((item) => item.url)).toEqual(["/blue-1.jpg", "/blue-2.jpg", "/blue-video.mp4"]);
  });

  it("falls back to product images for colors without a gallery", () => {
    expect(resolveProductGalleryMedia(product, "Nude")).toEqual([
      { type: "IMAGE", url: "/fallback-1.jpg" },
      { type: "IMAGE", url: "/fallback-2.jpg" },
    ]);
  });

  it("supports sparse one-image galleries", () => {
    expect(resolveProductGalleryMedia({ images: ["/only.jpg"] })).toEqual([{ type: "IMAGE", url: "/only.jpg" }]);
  });

  it("allows zoom for unknown or high-resolution images and blocks low-resolution images/videos", () => {
    expect(canZoomSource({ type: "IMAGE", url: "/unknown.jpg" })).toBe(true);
    expect(canZoomSource({ type: "IMAGE", url: "/large.jpg", width: 1600 })).toBe(true);
    expect(canZoomSource({ type: "IMAGE", url: "/small.jpg", width: 900 })).toBe(false);
    expect(canZoomSource({ type: "VIDEO", url: "/video.mp4", width: 1920 })).toBe(false);
  });

  it("keeps zoomed viewer at source width when dimensions are known", () => {
    expect(galleryViewerWidth({ type: "IMAGE", url: "/large.jpg", width: 1600 }, true)).toBe("1600px");
    expect(galleryViewerWidth({ type: "IMAGE", url: "/small.jpg", width: 900 }, true)).toBe("min(100vw, 900px)");
    expect(galleryViewerWidth({ type: "IMAGE", url: "/unknown.jpg" }, true)).toBe("150vw");
  });

  it("labels low-resolution source images with their true dimensions", () => {
    expect(sourceResolutionLabel({ type: "IMAGE", url: "/small.jpg", width: 900, height: 1200 })).toBe(
      "Showing at source size: 900 x 1200 px",
    );
    expect(sourceResolutionLabel({ type: "VIDEO", url: "/video.mp4", width: 900, height: 1200 })).toBeNull();
  });

  it("formats focal point metadata for CSS object positioning", () => {
    expect(focalObjectPosition({ type: "IMAGE", url: "/focused.jpg", focalPointX: 0.33, focalPointY: 0.72 })).toBe("33% 72%");
    expect(focalObjectPosition({ type: "IMAGE", url: "/center.jpg" })).toBe("50% 50%");
  });
});
