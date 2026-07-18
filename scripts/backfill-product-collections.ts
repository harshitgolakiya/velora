import { prisma } from "@/lib/prisma";
import { suggestCollectionSlugsForProduct } from "@/lib/collection-assignment";

async function main() {
  const collections = await prisma.collection.findMany({
    where: { slug: { in: ["studio-sculpt", "desert-run", "after-hours"] } },
    select: { id: true, slug: true },
  });
  const collectionBySlug = new Map(collections.map((collection) => [collection.slug, collection.id]));

  const products = await prisma.product.findMany({
    include: {
      category: true,
      tags: true,
      collections: { select: { id: true } },
    },
  });

  let updated = 0;
  for (const product of products) {
    const collectionIds = suggestCollectionSlugsForProduct({
      title: product.title,
      categoryName: product.category.name,
      tags: product.tags.map((tag) => tag.name),
    })
      .map((slug) => collectionBySlug.get(slug))
      .filter((id): id is string => Boolean(id));

    const existingIds = new Set(product.collections.map((collection) => collection.id));
    const missingIds = collectionIds.filter((id) => !existingIds.has(id));
    if (!missingIds.length) continue;

    await prisma.product.update({
      where: { id: product.id },
      data: {
        collections: {
          connect: missingIds.map((id) => ({ id })),
        },
      },
    });
    updated += 1;
  }

  console.log(`Backfilled collections for ${updated} products.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
