import { describe, expect, it } from "vitest";
import { CollectionStatus, ProductStatus } from "@prisma/client";
import { suggestCollectionSlugsForProduct } from "@/lib/collection-assignment";
import { prisma } from "@/lib/prisma";

describe("collection assignment", () => {
  it("assigns studio pieces to Pilates Studio", () => {
    expect(suggestCollectionSlugsForProduct({ title: "Studio Wrap Top", categoryName: "Tops", tags: ["Pilates"] })).toContain("pilates-studio");
    expect(suggestCollectionSlugsForProduct({ title: "Flow Crossback Bra", categoryName: "Sports Bras", tags: ["Yoga"] })).toContain("pilates-studio");
  });

  it("assigns tennis pieces to Court Club", () => {
    expect(suggestCollectionSlugsForProduct({ title: "Court Warm-Up Jacket", categoryName: "Jackets" })).toContain("court-club");
    expect(suggestCollectionSlugsForProduct({ title: "Performance Cap", categoryName: "Accessories", tags: ["Tennis"] })).toContain("court-club");
  });

  it("assigns everyday and training products while allowing multi-collection merchandising", () => {
    expect(suggestCollectionSlugsForProduct({ title: "Motion Rib Tank", categoryName: "Tops", tags: ["Everyday"] })).toEqual(["everyday-motion"]);
    expect(suggestCollectionSlugsForProduct({ title: "Studio Sculpt Legging", categoryName: "Leggings", tags: ["Pilates", "Training"] })).toEqual(["pilates-studio", "training-core"]);
  });

  it("keeps every published product attached to a published collection", async () => {
    const unassignedProducts = await prisma.product.findMany({
      where: {
        status: ProductStatus.PUBLISHED,
        collections: {
          none: {
            status: CollectionStatus.PUBLISHED,
          },
        },
      },
      select: {
        slug: true,
      },
    });

    const emptyCollections = await prisma.collection.findMany({
      where: {
        status: CollectionStatus.PUBLISHED,
        products: {
          none: {
            status: ProductStatus.PUBLISHED,
          },
        },
      },
      select: {
        slug: true,
      },
    });

    expect(unassignedProducts).toEqual([]);
    expect(emptyCollections).toEqual([]);
  });
});
