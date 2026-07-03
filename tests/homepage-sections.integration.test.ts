import { afterAll, describe, expect, it } from "vitest";
import { HomepageSectionStatus, HomepageSectionType } from "@prisma/client";
import { getDbHomepageSections } from "@/lib/catalog-db";
import { prisma } from "@/lib/prisma";

const suffix = `homepage-state-${Date.now()}`;
const sectionIds: string[] = [];
const homepageTypes = [
  "HERO",
  "FEATURED_PRODUCTS",
  "COLLECTION_STORY",
  "PRODUCT_GRID",
  "STORY_BAND",
  "NEWSLETTER",
  "CUSTOM",
] as const;

async function createSection(input: {
  type: (typeof homepageTypes)[number];
  state: "published" | "draft-preview" | "disabled";
  sortOrder: number;
}) {
  const section = await prisma.homepageSection.create({
    data: {
      key: `${suffix}-${input.type.toLowerCase().replaceAll("_", "-")}-${input.state}`,
      type: input.type as HomepageSectionType,
      status: input.state === "draft-preview" ? HomepageSectionStatus.DRAFT : HomepageSectionStatus.PUBLISHED,
      enabled: input.state !== "disabled",
      title: `${input.type} ${input.state}`,
      subtitle: "Integration fixture",
      body: "Homepage section integration fixture.",
      ctaLabel: "Shop now",
      ctaHref: "/shop",
      imageUrl: `/images/test/${input.type.toLowerCase()}.jpg`,
      sortOrder: input.sortOrder,
      publishedAt: input.state === "draft-preview" ? null : new Date(),
      settings: JSON.stringify({ density: "test" }),
    },
  });
  sectionIds.push(section.id);
  return section;
}

describe("homepage section publication states", () => {
  afterAll(async () => {
    for (const id of sectionIds) await prisma.homepageSection.delete({ where: { id } }).catch(() => undefined);
  });

  it("maps every published section type and excludes draft-preview and disabled rows from the storefront", async () => {
    for (const [index, type] of homepageTypes.entries()) {
      await createSection({ type, state: "published", sortOrder: index });
      await createSection({ type, state: "draft-preview", sortOrder: index + 100 });
      await createSection({ type, state: "disabled", sortOrder: index + 200 });
    }

    const sections = (await getDbHomepageSections()).filter((section) => section.key.startsWith(suffix));

    expect(sections.map((section) => section.type)).toEqual(homepageTypes);
    expect(sections.map((section) => section.status)).toEqual(homepageTypes.map(() => "PUBLISHED"));
    expect(sections.every((section) => section.title.endsWith("published"))).toBe(true);
    expect(sections.some((section) => section.key.endsWith("draft-preview"))).toBe(false);
    expect(sections.some((section) => section.key.endsWith("disabled"))).toBe(false);
  });

  it("keeps complete media tiles and removes incomplete media tiles from published sections", async () => {
    const section = await prisma.homepageSection.create({
      data: {
        key: `${suffix}-incomplete-media`,
        type: HomepageSectionType.CUSTOM,
        status: HomepageSectionStatus.PUBLISHED,
        enabled: true,
        title: "Incomplete media fixture",
        sortOrder: 500,
        publishedAt: new Date(),
        settings: JSON.stringify({
          categoryMediaItems: [
            { id: "complete", title: "Leggings", href: "/shop?category=Leggings", mediaType: "IMAGE", imageUrl: "/images/test/leggings.jpg" },
            { id: "missing-image", title: "Tops", href: "/shop?category=Tops", mediaType: "IMAGE" },
            { id: "missing-title", title: "", href: "/shop?category=Bras", mediaType: "IMAGE", imageUrl: "/images/test/bras.jpg" },
          ],
        }),
      },
    });
    sectionIds.push(section.id);

    const storefrontSection = (await getDbHomepageSections()).find((item) => item.key === section.key);

    expect(storefrontSection?.categoryMediaItems).toEqual([
      { id: "complete", title: "Leggings", href: "/shop?category=Leggings", mediaType: "IMAGE", imageUrl: "/images/test/leggings.jpg" },
    ]);
  });
});
