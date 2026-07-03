import { describe, expect, it } from "vitest";
import { getHomepagePublicationError } from "@/lib/homepage-section-validation";

describe("homepage section publication validation", () => {
  it("allows incomplete category media while the section is a draft", () => {
    expect(
      getHomepagePublicationError({
        status: "DRAFT",
        settings: {
          categoryMediaItems: [{ title: "Leggings", href: "/shop?category=Leggings", mediaType: "IMAGE" }],
        },
      }),
    ).toBeNull();
  });

  it("blocks published image tiles without media", () => {
    expect(
      getHomepagePublicationError({
        status: "PUBLISHED",
        settings: {
          categoryMediaItems: [{ title: "Leggings", href: "/shop?category=Leggings", mediaType: "IMAGE" }],
        },
      }),
    ).toBe("Category media tile 1 needs an image before publishing.");
  });

  it("blocks scheduled image tiles without media", () => {
    expect(
      getHomepagePublicationError({
        status: "SCHEDULED",
        settings: {
          categoryMediaItems: [{ title: "Leggings", href: "/shop?category=Leggings", mediaType: "IMAGE" }],
        },
      }),
    ).toBe("Category media tile 1 needs an image before publishing.");
  });

  it("blocks published Cloudflare Stream tiles without a stream id", () => {
    expect(
      getHomepagePublicationError({
        status: "PUBLISHED",
        settings: {
          categoryMediaItems: [{ title: "Tops", href: "/shop?category=Tops", mediaType: "CLOUDFLARE_STREAM" }],
        },
      }),
    ).toBe("Category media tile 1 needs a Cloudflare Stream ID before publishing.");
  });

  it("allows complete published category media tiles", () => {
    expect(
      getHomepagePublicationError({
        status: "PUBLISHED",
        settings: {
          categoryMediaItems: [
            { title: "Leggings", href: "/shop?category=Leggings", mediaType: "IMAGE", imageUrl: "/images/leggings.jpg" },
            { title: "Tops", href: "/shop?category=Tops", mediaType: "CLOUDFLARE_STREAM", cloudflareStreamId: "stream-id" },
            { title: "Bras", href: "/shop?category=Sports%20Bras", mediaType: "VIDEO", videoUrl: "/uploads/bras.mp4" },
          ],
        },
      }),
    ).toBeNull();
  });
});
