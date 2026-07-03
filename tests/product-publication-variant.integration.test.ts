import { afterAll, describe, expect, it } from "vitest";
import { ProductStatus } from "@prisma/client";
import { getDbProduct, getDbProductPreview } from "@/lib/catalog-db";
import { prisma } from "@/lib/prisma";

const suffix = `publication-${Date.now()}`;
let draftProductId: string | undefined;
let publishedProductId: string | undefined;
let categoryId: string | undefined;

describe("product publication and variant mapping", () => {
  afterAll(async () => {
    if (draftProductId) await prisma.product.delete({ where: { id: draftProductId } }).catch(() => undefined);
    if (publishedProductId) await prisma.product.delete({ where: { id: publishedProductId } }).catch(() => undefined);
    if (categoryId) await prisma.category.delete({ where: { id: categoryId } }).catch(() => undefined);
  });

  it("keeps drafts out of public catalog while preserving preview variant price, SKU, inventory, and media", async () => {
    const category = await prisma.category.create({
      data: { name: `Publication Category ${suffix}`, slug: `publication-category-${suffix}` },
    });
    categoryId = category.id;
    const color = await prisma.color.create({ data: { name: `Publication Ink ${suffix}`, hex: "#0f1115" } });
    const size = await prisma.size.create({ data: { id: `Publication-M-${suffix}`, name: `Publication M ${suffix}` } });

    const draft = await prisma.product.create({
      data: {
        title: `Draft Publication Product ${suffix}`,
        slug: `draft-publication-product-${suffix}`,
        description: "Draft should not be public.",
        price: 320,
        salePrice: 280,
        sku: `DRAFT-PUB-${suffix}`,
        fabricDetails: "Draft fabric",
        careInstructions: "Draft care",
        status: ProductStatus.DRAFT,
        categoryId: category.id,
        images: { create: { url: `/images/admin/products/draft-${suffix}.jpg`, alt: "Draft image", position: 0 } },
        variants: {
          create: {
            colorId: color.id,
            sizeId: size.id,
            sku: `DRAFT-PUB-${suffix}-M-INK`,
            stock: 9,
            reservedStock: 2,
            lowStockThreshold: 3,
            allowBackorder: true,
            medias: { create: { type: "IMAGE", url: `/images/admin/products/draft-${suffix}.jpg`, sortOrder: 0, isHoverImage: true } },
          },
        },
      },
    });
    draftProductId = draft.id;

    const published = await prisma.product.create({
      data: {
        title: `Published Publication Product ${suffix}`,
        slug: `published-publication-product-${suffix}`,
        description: "Published should be public.",
        price: 260,
        sku: `PUBLISHED-PUB-${suffix}`,
        fabricDetails: "Published fabric",
        careInstructions: "Published care",
        status: ProductStatus.PUBLISHED,
        publishedAt: new Date(),
        categoryId: category.id,
        images: { create: { url: `/images/admin/products/published-${suffix}.jpg`, alt: "Published image", position: 0 } },
        variants: {
          create: {
            colorId: color.id,
            sizeId: size.id,
            sku: `PUBLISHED-PUB-${suffix}-M-INK`,
            stock: 4,
          },
        },
      },
    });
    publishedProductId = published.id;

    await expect(getDbProduct(draft.slug)).resolves.toBeUndefined();
    await expect(getDbProduct(published.slug)).resolves.toEqual(expect.objectContaining({ slug: published.slug }));

    const preview = await getDbProductPreview(draft.id);
    expect(preview).toMatchObject({
      slug: draft.slug,
      price: 320,
      salePrice: 280,
      stock: 9,
    });
    expect(preview?.variants?.[0]).toMatchObject({
      sku: `DRAFT-PUB-${suffix}-M-INK`,
      stock: 7,
      reservedStock: 2,
      lowStockThreshold: 3,
      allowBackorder: true,
    });
    expect(preview?.variantMediaByColor?.[color.name]?.[0]).toMatchObject({
      url: `/images/admin/products/draft-${suffix}.jpg`,
      isHoverImage: true,
    });
  });
});
