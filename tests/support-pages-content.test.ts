import { describe, expect, it } from "vitest";
import { getPageContentMetadata, parseContentBlocks } from "@/lib/content-cms";
import { prisma } from "@/lib/prisma";

const requiredSupportSlugs = [
  "shipping",
  "returns",
  "contact",
  "faqs",
  "privacy",
  "terms",
  "size-guide",
  "care-guide",
  "fabric-guide",
] as const;

describe("admin-backed support content pages", () => {
  it("publishes every required support, legal, and guide page with blocks and SEO fields", async () => {
    const pages = await prisma.pageContent.findMany({
      where: { slug: { in: [...requiredSupportSlugs] } },
      select: {
        slug: true,
        status: true,
        blocks: true,
        seoTitle: true,
        seoDescription: true,
      },
    });
    const bySlug = new Map(pages.map((page) => [page.slug, page]));

    for (const slug of requiredSupportSlugs) {
      const page = bySlug.get(slug);
      expect(page, `${slug} should exist as PageContent`).toBeDefined();
      expect(page?.status, `${slug} should be published`).toBe("PUBLISHED");
      expect(parseContentBlocks(page?.blocks ?? "[]").length, `${slug} should have renderable blocks`).toBeGreaterThan(0);
      expect(page?.seoTitle, `${slug} should have an admin SEO title`).toBeTruthy();
      expect(page?.seoDescription, `${slug} should have an admin SEO description`).toBeTruthy();
    }
  });

  it("uses admin SEO fields for content-page metadata", async () => {
    const metadata = await getPageContentMetadata({
      slug: "shipping",
      path: "/shipping",
      title: "Fallback shipping title",
      description: "Fallback shipping description",
    });

    expect(metadata.title).toBe("Shipping");
    expect(metadata.description).toBe("Delivery options, fees, tracking, and dispatch guidance.");
    expect(metadata.alternates).toBeDefined();
    expect(metadata.openGraph).toMatchObject({
      title: "Shipping",
      description: "Delivery options, fees, tracking, and dispatch guidance.",
    });
  });
});
