import { afterAll, describe, expect, it } from "vitest";
import { ProductStatus } from "@prisma/client";
import { getDbProductPreview } from "@/lib/catalog-db";
import { prisma } from "@/lib/prisma";

const suffix = `field-map-${Date.now()}`;
let productId: string | undefined;
let categoryId: string | undefined;
let mediaAssetId: string | undefined;

describe("product field mapping", () => {
  afterAll(async () => {
    if (productId) await prisma.product.delete({ where: { id: productId } }).catch(() => undefined);
    if (categoryId) await prisma.category.delete({ where: { id: categoryId } }).catch(() => undefined);
    if (mediaAssetId) await prisma.mediaAsset.delete({ where: { id: mediaAssetId } }).catch(() => undefined);
  });

  it("maps admin product fields to the storefront product shape used by the PDP", async () => {
    const category = await prisma.category.create({
      data: { name: `Mapping Category ${suffix}`, slug: `mapping-category-${suffix}` },
    });
    categoryId = category.id;

    const color = await prisma.color.create({ data: { name: `Mapping Black ${suffix}`, hex: "#111111" } });
    const size = await prisma.size.create({ data: { id: `Mapping-S-${suffix}`, name: `Mapping S ${suffix}` } });
    const media = await prisma.mediaAsset.create({
      data: {
        name: `mapping-media-${suffix}`,
        originalName: "mapping-media.jpg",
        url: `/images/admin/products/mapping-media-${suffix}.jpg`,
        originalUrl: `/images/admin/products/mapping-media-${suffix}.jpg`,
        mimeType: "image/jpeg",
        mediaType: "IMAGE",
        sizeBytes: 120000,
        width: 1600,
        height: 2000,
        aspectRatio: 0.8,
        responsiveWidths: JSON.stringify([320, 640, 1280, 1600]),
        derivativeManifest: JSON.stringify([{ width: 1280, url: `/images/admin/products/mapping-media-${suffix}.jpg`, format: "AVIF" }]),
        altText: "Custom mapped alt text",
        focalPointX: 0.25,
        focalPointY: 0.7,
      },
    });
    mediaAssetId = media.id;

    const product = await prisma.product.create({
      data: {
        title: `Mapping Product ${suffix}`,
        slug: `mapping-product-${suffix}`,
        description: "Mapped product description.",
        price: 199,
        sku: `MAP-${suffix}`,
        fabricDetails: "Mapped fabric details.",
        careInstructions: "Mapped care instructions.",
        fitSummary: "Mapped fit summary.",
        modelReference: "Mapped model reference.",
        sizeAdvice: "Mapped size advice.",
        dimensionNotes: JSON.stringify(["Mapped inseam", "Mapped rise"]),
        status: ProductStatus.DRAFT,
        categoryId: category.id,
        images: {
          create: { url: media.url, alt: "Mapped product image", position: 0 },
        },
        variants: {
          create: {
            colorId: color.id,
            sizeId: size.id,
            sku: `MAP-${suffix}-S-BLACK`,
            stock: 7,
            medias: {
              create: { type: "IMAGE", url: media.url, sortOrder: 0, isHoverImage: true },
            },
          },
        },
      },
    });
    productId = product.id;

    const mapped = await getDbProductPreview(product.id);

    expect(mapped).toMatchObject({
      name: product.title,
      slug: product.slug,
      description: "Mapped product description.",
      fabric: "Mapped fabric details.",
      care: "Mapped care instructions.",
      fitSummary: "Mapped fit summary.",
      modelReference: "Mapped model reference.",
      sizeAdvice: "Mapped size advice.",
      dimensionNotes: ["Mapped inseam", "Mapped rise"],
      price: 199,
      stock: 7,
    });
    expect(mapped?.variants?.[0]).toMatchObject({
      sku: `MAP-${suffix}-S-BLACK`,
      stock: 7,
      color: { name: color.name, hex: "#111111" },
      size: { name: size.name },
    });
    expect(mapped?.variantMediaByColor?.[color.name]?.[0]).toMatchObject({
      url: media.url,
      altText: "Custom mapped alt text",
      focalPointX: 0.25,
      focalPointY: 0.7,
      width: 1600,
      height: 2000,
      isHoverImage: true,
    });
  });
});
