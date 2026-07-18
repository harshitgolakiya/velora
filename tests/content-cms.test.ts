import { describe, expect, it } from "vitest";
import { isPageContentPublic, pageContentInputSchema, parseContentBlocks } from "@/lib/content-cms";

const page = {
  slug: "shipping-guide",
  title: "Shipping Guide",
  summary: "Delivery information",
  body: "",
  contentType: "GUIDE",
  status: "PUBLISHED",
  locale: "en",
  blocks: [{ id: "hero-1", type: "HERO", heading: "Delivery", ctaLabel: "Track order", ctaHref: "/track-order" }],
};

describe("structured content CMS", () => {
  it("accepts typed blocks with safe internal links", () => {
    expect(pageContentInputSchema.safeParse(page).success).toBe(true);
  });

  it("rejects HTML markup and unsafe links", () => {
    expect(pageContentInputSchema.safeParse({ ...page, blocks: [{ id: "text", type: "TEXT", heading: "Unsafe", body: "<script>alert(1)</script>" }] }).success).toBe(false);
    expect(pageContentInputSchema.safeParse({ ...page, blocks: [{ id: "text", type: "TEXT", heading: "Unsafe", body: "Click <img src=x onerror=alert(1)> now" }] }).success).toBe(false);
    expect(pageContentInputSchema.safeParse({ ...page, blocks: [{ id: "hero", type: "HERO", heading: "Unsafe", ctaHref: "javascript:alert(1)" }] }).success).toBe(false);
    expect(pageContentInputSchema.safeParse({ ...page, blocks: [{ id: "hero", type: "HERO", heading: "Unsafe", ctaHref: "http://example.com" }] }).success).toBe(false);
    expect(pageContentInputSchema.safeParse({ ...page, blocks: [{ id: "hero", type: "HERO", heading: "Unsafe", imageUrl: "data:image/svg+xml,<svg onload=alert(1)>" }] }).success).toBe(false);
    expect(pageContentInputSchema.safeParse({ ...page, socialImage: "ftp://example.com/image.jpg" }).success).toBe(false);
  });

  it("requires a schedule date and safely handles invalid stored blocks", () => {
    expect(pageContentInputSchema.safeParse({ ...page, status: "SCHEDULED" }).success).toBe(false);
    expect(parseContentBlocks("not-json")).toEqual([]);
    expect(parseContentBlocks(JSON.stringify([{ id: "bad", type: "UNKNOWN" }]))).toEqual([]);
  });

  it("keeps drafts and future schedules private while exposing due content", () => {
    const now = new Date("2026-06-22T12:00:00.000Z");
    expect(isPageContentPublic("DRAFT", null, now)).toBe(false);
    expect(isPageContentPublic("PUBLISHED", null, now)).toBe(true);
    expect(isPageContentPublic("SCHEDULED", new Date("2026-06-22T12:01:00.000Z"), now)).toBe(false);
    expect(isPageContentPublic("SCHEDULED", new Date("2026-06-22T11:59:00.000Z"), now)).toBe(true);
  });
});
