import { describe, expect, it } from "vitest";
import {
  isPublicHomepageSection,
  parseHomepageSettings,
  parseStorefrontCategoryMediaItems,
  type StorefrontHomepageSection,
} from "@/lib/homepage-sections";

const homepageTypes: StorefrontHomepageSection["type"][] = [
  "HERO",
  "FEATURED_PRODUCTS",
  "COLLECTION_STORY",
  "PRODUCT_GRID",
  "STORY_BAND",
  "NEWSLETTER",
  "CUSTOM",
];

describe("homepage section storefront state", () => {
  it.each(homepageTypes)("allows published and enabled %s sections on the public storefront", () => {
    expect(isPublicHomepageSection({ enabled: true, status: "PUBLISHED" })).toBe(true);
  });

  it("excludes draft and disabled sections from the public storefront", () => {
    expect(isPublicHomepageSection({ enabled: true, status: "DRAFT" })).toBe(false);
    expect(isPublicHomepageSection({ enabled: false, status: "PUBLISHED" })).toBe(false);
    expect(isPublicHomepageSection({ enabled: false, status: "DRAFT" })).toBe(false);
  });

  it("falls back to empty settings for invalid JSON and non-object settings", () => {
    expect(parseHomepageSettings("{bad json")).toEqual({});
    expect(parseHomepageSettings("[1,2,3]")).toEqual({});
    expect(parseHomepageSettings(null)).toEqual({});
  });

  it("keeps complete category media tiles and removes incomplete storefront tiles", () => {
    const settings = parseHomepageSettings(
      JSON.stringify({
        categoryMediaItems: [
          { id: "leggings", title: " Leggings ", href: " /shop?category=Leggings ", mediaType: "IMAGE", imageUrl: " /a.jpg " },
          { id: "missing-title", title: "", href: "/shop", mediaType: "IMAGE", imageUrl: "/b.jpg" },
          { id: "missing-href", title: "Tops", href: "", mediaType: "IMAGE", imageUrl: "/c.jpg" },
          { id: "missing-image", title: "Bras", href: "/shop?category=Sports%20Bras", mediaType: "IMAGE" },
          { id: "missing-video", title: "Pants", href: "/shop?category=Pants", mediaType: "VIDEO" },
          { id: "missing-stream", title: "Jackets", href: "/shop?category=Jackets", mediaType: "CLOUDFLARE_STREAM" },
          { id: "stream", title: "Video", href: "/collections/video", mediaType: "CLOUDFLARE_STREAM", cloudflareStreamId: "abc123" },
          { id: "poster-image", title: "Accessories", href: "/shop?category=Accessories", mediaType: "IMAGE", posterUrl: "/poster.jpg" },
        ],
      }),
    );

    expect(parseStorefrontCategoryMediaItems(settings)).toEqual([
      {
        id: "leggings",
        title: "Leggings",
        href: "/shop?category=Leggings",
        mediaType: "IMAGE",
        imageUrl: "/a.jpg",
      },
      {
        id: "stream",
        title: "Video",
        href: "/collections/video",
        mediaType: "CLOUDFLARE_STREAM",
        cloudflareStreamId: "abc123",
      },
      {
        id: "poster-image",
        title: "Accessories",
        href: "/shop?category=Accessories",
        mediaType: "IMAGE",
        posterUrl: "/poster.jpg",
      },
    ]);
  });
});
