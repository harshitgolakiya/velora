import { describe, expect, it } from "vitest";
import { CollectionStatus, ProductStatus } from "@prisma/client";
import { suggestCollectionSlugsForProduct } from "@/lib/collection-assignment";
import { prisma } from "@/lib/prisma";

describe("collection assignment", () => {
  it("assigns studio training products to Studio Sculpt", () => {
    expect(suggestCollectionSlugsForProduct({ title: "Contour Leggings", categoryName: "Leggings" })).toContain("studio-sculpt");
    expect(suggestCollectionSlugsForProduct({ title: "Soft Sports Bra", categoryName: "Sports Bras" })).toContain("studio-sculpt");
  });

  it("assigns jackets and bottles to Desert Run", () => {
    expect(suggestCollectionSlugsForProduct({ title: "Track Jacket", categoryName: "Jackets" })).toContain("desert-run");
    expect(suggestCollectionSlugsForProduct({ title: "ccéa Bottle Blue", categoryName: "Tumblers" })).toContain("desert-run");
  });

  it("assigns soft tops to After Hours while allowing multi-collection merchandising", () => {
    expect(suggestCollectionSlugsForProduct({ title: "Wrap top", categoryName: "Tops" })).toEqual(["after-hours"]);
    expect(suggestCollectionSlugsForProduct({ title: "Soft Leggings", categoryName: "Leggings" })).toEqual(["studio-sculpt", "after-hours"]);
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
