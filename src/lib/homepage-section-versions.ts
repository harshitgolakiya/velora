import "server-only";

import { prisma } from "./prisma";

export async function createHomepageSectionVersion(homepageSectionId: string, actor: string) {
  const section = await prisma.homepageSection.findUnique({
    where: { id: homepageSectionId },
    include: { products: { select: { id: true } } },
  });
  if (!section) throw new Error("Homepage section not found");

  const aggregate = await prisma.homepageSectionVersion.aggregate({
    where: { homepageSectionId },
    _max: { version: true },
  });

  return prisma.homepageSectionVersion.create({
    data: {
      homepageSectionId,
      version: (aggregate._max.version ?? 0) + 1,
      key: section.key,
      type: section.type,
      status: section.status,
      title: section.title,
      subtitle: section.subtitle,
      body: section.body,
      ctaLabel: section.ctaLabel,
      ctaHref: section.ctaHref,
      imageUrl: section.imageUrl,
      mobileImageUrl: section.mobileImageUrl,
      sortOrder: section.sortOrder,
      enabled: section.enabled,
      settings: section.settings,
      collectionId: section.collectionId,
      productIds: JSON.stringify(section.products.map((product) => product.id)),
      scheduledAt: section.scheduledAt,
      publishedAt: section.publishedAt,
      createdBy: actor,
    },
  });
}

