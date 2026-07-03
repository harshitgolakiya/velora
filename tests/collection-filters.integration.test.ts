import { afterAll, describe, expect, it } from "vitest";
import { CollectionStatus, ProductStatus } from "@prisma/client";
import type { Collection } from "@/lib/catalog";
import { getDbProducts } from "@/lib/catalog-db";
import { deriveFilterOptions, filterProducts } from "@/lib/product-filters";
import { prisma } from "@/lib/prisma";

const suffix = `collection-filter-${Date.now()}`;
const productIds: string[] = [];
const collectionIds: string[] = [];
const categoryIds: string[] = [];
const colorIds: string[] = [];
const sizeIds: string[] = [];

describe("collection filters with imported catalog rows", () => {
  afterAll(async () => {
    for (const id of productIds) await prisma.product.delete({ where: { id } }).catch(() => undefined);
    for (const id of collectionIds) await prisma.collection.delete({ where: { id } }).catch(() => undefined);
    for (const id of categoryIds) await prisma.category.delete({ where: { id } }).catch(() => undefined);
    for (const id of colorIds) await prisma.color.delete({ where: { id } }).catch(() => undefined);
    for (const id of sizeIds) await prisma.size.delete({ where: { id } }).catch(() => undefined);
  });

  it("scopes customer filters to assigned collection products and hides raw placeholder attributes", async () => {
    const category = await prisma.category.create({
      data: { name: `Imported Category ${suffix}`, slug: `imported-category-${suffix}` },
    });
    categoryIds.push(category.id);

    const collection = await prisma.collection.create({
      data: {
        name: `Imported Studio ${suffix}`,
        slug: `imported-studio-${suffix}`,
        summary: "Imported collection fixture",
        status: CollectionStatus.PUBLISHED,
        publishedAt: new Date(),
      },
    });
    collectionIds.push(collection.id);

    const black = await prisma.color.create({ data: { name: "Black", hex: "#111111" } });
    const placeholderColor = await prisma.color.create({ data: { name: "Default", hex: "#999999" } });
    const cloud = await prisma.color.create({ data: { name: `Cloud ${suffix}`, hex: "#dfe6ef" } });
    colorIds.push(black.id, placeholderColor.id, cloud.id);

    const small = await prisma.size.create({ data: { id: `S-${suffix}`, name: "S" } });
    const placeholderSize = await prisma.size.create({ data: { id: `select-option-${suffix}`, name: "Select option" } });
    const medium = await prisma.size.create({ data: { id: `M-${suffix}`, name: "M" } });
    sizeIds.push(small.id, placeholderSize.id, medium.id);

    const assigned = await prisma.product.create({
      data: {
        title: `Assigned Imported Product ${suffix}`,
        slug: `assigned-imported-product-${suffix}`,
        description: "Assigned imported product",
        price: 180,
        sku: `ASSIGNED-${suffix}`,
        fabricDetails: "Nylon elastane",
        careInstructions: "Machine wash cold",
        status: ProductStatus.PUBLISHED,
        publishedAt: new Date(),
        categoryId: category.id,
        collections: { connect: { id: collection.id } },
        variants: {
          create: [
            { colorId: black.id, sizeId: small.id, sku: `ASSIGNED-${suffix}-S-BLACK`, stock: 4 },
            { colorId: placeholderColor.id, sizeId: placeholderSize.id, sku: `ASSIGNED-${suffix}-DEFAULT`, stock: 2 },
          ],
        },
      },
    });
    productIds.push(assigned.id);

    const unassigned = await prisma.product.create({
      data: {
        title: `Unassigned Imported Product ${suffix}`,
        slug: `unassigned-imported-product-${suffix}`,
        description: "Unassigned imported product",
        price: 160,
        sku: `UNASSIGNED-${suffix}`,
        fabricDetails: "Cotton blend",
        careInstructions: "Machine wash cold",
        status: ProductStatus.PUBLISHED,
        publishedAt: new Date(),
        categoryId: category.id,
        variants: {
          create: { colorId: cloud.id, sizeId: medium.id, sku: `UNASSIGNED-${suffix}-M-CLOUD`, stock: 8 },
        },
      },
    });
    productIds.push(unassigned.id);

    const products = (await getDbProducts()).filter((product) => product.sku?.endsWith(suffix));
    const storefrontCollection: Collection = {
      slug: collection.slug,
      name: collection.name,
      summary: collection.summary,
      image: collection.bannerImage ?? "/images/velora/hero-sculpted-essentials.jpg",
    };
    const options = deriveFilterOptions({
      products,
      categories: [category.name],
      collections: [storefrontCollection],
      currentCollection: collection.slug,
    });

    expect(options).toMatchObject({
      categories: [category.name],
      collections: [],
      colors: ["Black", "One Color"],
      sizes: ["One Size", "S"],
    });
    expect(options.colors).not.toContain("Default");
    expect(options.colors).not.toContain(cloud.name);
    expect(options.sizes).not.toContain("Select option");
    expect(options.sizes).not.toContain("M");

    expect(filterProducts({
      products,
      collection: collection.slug,
      selectedCollection: "All",
      category: "All",
      size: "S",
      color: "Black",
      gender: "All",
      style: "All",
      material: "All",
    }).map((product) => product.id)).toEqual([assigned.id]);
  });
});
