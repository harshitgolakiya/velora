import "server-only";

import { CollectionStatus, HomepageSectionStatus, ProductStatus } from "@prisma/client";
import { prisma } from "./prisma";

const globalScheduledPublishing = globalThis as unknown as {
  scheduledPublishing?: {
    checkedAt: number;
    promise?: Promise<{ count: number }>;
  };
};

export async function publishDueScheduledProducts(now = new Date()) {
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return { count: 0 };
  }

  const state = globalScheduledPublishing.scheduledPublishing ?? { checkedAt: 0 };
  globalScheduledPublishing.scheduledPublishing = state;
  if (state.promise) return state.promise;
  if (now.getTime() - state.checkedAt < 60_000) return { count: 0 };

  state.promise = (async () => {
    try {
      const due = await prisma.product.findFirst({
        where: {
          status: ProductStatus.SCHEDULED,
          scheduledAt: { lte: now },
        },
        select: { id: true },
      });
      state.checkedAt = now.getTime();
      if (!due) return { count: 0 };

      return await prisma.product.updateMany({
        where: {
          status: ProductStatus.SCHEDULED,
          scheduledAt: { lte: now },
        },
        data: {
          status: ProductStatus.PUBLISHED,
          scheduledAt: null,
          publishedAt: now,
        },
      });
    } catch {
      return { count: 0 };
    } finally {
      state.promise = undefined;
    }
  })();

  return state.promise;
}

export async function publishDueScheduledHomepageSections(now = new Date()) {
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return { count: 0 };
  }

  try {
    const dueSections = await prisma.homepageSection.findMany({
      where: {
        status: HomepageSectionStatus.SCHEDULED,
        scheduledAt: { lte: now },
      },
      select: { id: true, title: true, key: true, scheduledAt: true },
    });

    if (!dueSections.length) return { count: 0 };

    const result = await prisma.homepageSection.updateMany({
      where: {
        id: { in: dueSections.map((section) => section.id) },
        status: HomepageSectionStatus.SCHEDULED,
        scheduledAt: { lte: now },
      },
      data: {
        status: HomepageSectionStatus.PUBLISHED,
        scheduledAt: null,
        publishedAt: now,
      },
    });

    await Promise.all(
      dueSections.map((section) =>
        prisma.activityLog.create({
          data: {
            actor: "System",
            action: `Published scheduled homepage section ${section.title}`,
            entityType: "homepage_section",
            entityId: section.id,
            metadata: JSON.stringify({
              key: section.key,
              scheduledAt: section.scheduledAt?.toISOString(),
              publishedAt: now.toISOString(),
            }),
          },
        }),
      ),
    );

    return result;
  } catch {
    return { count: 0 };
  }
}

export async function publishDueScheduledCollections(now = new Date()) {
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return { count: 0 };
  }

  try {
    const dueCollections = await prisma.collection.findMany({
      where: {
        status: CollectionStatus.SCHEDULED,
        scheduledAt: { lte: now },
      },
      select: { id: true, name: true, slug: true, scheduledAt: true },
    });

    if (!dueCollections.length) return { count: 0 };

    const result = await prisma.collection.updateMany({
      where: {
        id: { in: dueCollections.map((collection) => collection.id) },
        status: CollectionStatus.SCHEDULED,
        scheduledAt: { lte: now },
      },
      data: {
        status: CollectionStatus.PUBLISHED,
        scheduledAt: null,
        publishedAt: now,
      },
    });

    await Promise.all(
      dueCollections.map((collection) =>
        prisma.activityLog.create({
          data: {
            actor: "System",
            action: `Published scheduled collection ${collection.name}`,
            entityType: "collection",
            entityId: collection.id,
            metadata: JSON.stringify({
              slug: collection.slug,
              scheduledAt: collection.scheduledAt?.toISOString(),
              publishedAt: now.toISOString(),
            }),
          },
        }),
      ),
    );

    return result;
  } catch {
    return { count: 0 };
  }
}
