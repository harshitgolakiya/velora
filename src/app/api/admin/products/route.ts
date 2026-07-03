import { NextResponse } from "next/server";
import { MediaType, ProductStatus } from "@prisma/client";
import { recordAdminActivity } from "@/lib/admin-activity";
import { requireAdminApiPermission } from "@/lib/admin-api";
import { mapAdminProduct } from "@/lib/admin-catalog";
import { validateProductSkus } from "@/lib/admin-product-validation";
import { createProductSchema } from "@/lib/admin-validation";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";

async function uniqueSlug(name: string) {
  const base = slugify(name);
  let slug = base;
  let suffix = 2;

  while (await prisma.product.findUnique({ where: { slug } })) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }

  return slug;
}

function orderProductImages(colors: { images: string[] }[], primaryImage?: string) {
  const images = Array.from(new Set(colors.flatMap((color) => color.images).filter(Boolean)));
  if (!primaryImage || !images.includes(primaryImage)) return images;
  return [primaryImage, ...images.filter((image) => image !== primaryImage)];
}

export async function POST(request: Request) {
  const auth = await requireAdminApiPermission("catalog:write");
  if ("response" in auth) return auth.response;

  const parsed = createProductSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid product payload", errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const slug = await uniqueSlug(data.name);
  const productImages = orderProductImages(data.colors, data.primaryImage);
  const skuError = await validateProductSkus({
    productSku: data.sku,
    sizeNames: data.sizeNames,
    colors: data.colors,
  });

  if (skuError) {
    return NextResponse.json({ message: skuError }, { status: 409 });
  }

  try {
    const product = await prisma.$transaction(async (tx) => {
      const colors = await Promise.all(
        data.colors.map(async (color) => {
          const existing = await tx.color.findFirst({ where: { name: color.name } });
          return existing
            ? tx.color.update({ where: { id: existing.id }, data: { hex: color.hex } })
            : tx.color.create({ data: { name: color.name, hex: color.hex } });
        }),
      );

      const sizes = await Promise.all(
        data.sizeNames.map(async (name) => {
          const existing = await tx.size.findFirst({ where: { name } });
          return existing ?? tx.size.create({ data: { id: name, name } });
        }),
      );

      return tx.product.create({
        data: {
          title: data.name,
          slug,
          description: data.description,
          price: data.price,
          salePrice: data.salePrice ?? null,
          sku: data.sku,
          fabricDetails: data.fabricDetails,
          careInstructions: data.careInstructions,
          fitSummary: data.fitSummary?.trim() || null,
          modelReference: data.modelReference?.trim() || null,
          sizeAdvice: data.sizeAdvice?.trim() || null,
          dimensionNotes: JSON.stringify(data.dimensionNotes.filter(Boolean)),
          seoTitle: data.seoTitle || `${data.name} | Velora`,
          seoDescription: data.seoDescription || data.description,
          socialImage: data.socialImage?.trim() || productImages[0] || null,
          status: data.status as ProductStatus,
          publishedAt: data.status === "PUBLISHED" ? new Date() : null,
          featured: data.featured,
          bestSeller: data.bestSeller,
          newArrival: data.newArrival,
          categoryId: data.categoryId,
          collections: data.collectionIds.length
            ? { connect: data.collectionIds.map((id) => ({ id })) }
            : undefined,
          tags: data.tagIds.length
            ? { connect: data.tagIds.map((id) => ({ id })) }
            : undefined,
          images: {
            create: productImages
              .slice(0, 8)
              .map((url, position) => ({
                url,
                alt: data.name,
                position,
              })),
          },
          variants: {
            create: data.colors.flatMap((colorInput, colorIndex) =>
              sizes.map((size) => {
                const mediaUrls = colorInput.images.filter(Boolean);
                const media = [
                  ...mediaUrls.map((url, sortOrder) => ({
                    type: MediaType.IMAGE,
                    url,
                    sortOrder,
                    isHoverImage: colorInput.hoverImage ? url === colorInput.hoverImage : sortOrder === 1,
                  })),
                  ...(colorInput.video
                    ? [
                        {
                          type: MediaType.VIDEO,
                          url: colorInput.video,
                          sortOrder: mediaUrls.length,
                          isHoverImage: false,
                        },
                      ]
                    : []),
                ];

                return {
                  colorId: colors[colorIndex].id,
                  sizeId: size.id,
                  sku:
                    colorInput.skuBySize[size.name]?.trim() ||
                    `${data.sku}-${size.name}-${colorInput.name}`.toUpperCase().replace(/\s+/g, "-"),
                  stock: colorInput.stockBySize[size.name] ?? 0,
                  medias: media.length ? { create: media } : undefined,
                };
              }),
            ),
          },
        },
        include: {
          category: true,
          collections: true,
          tags: { include: { _count: { select: { products: true } } } },
          images: { orderBy: { position: "asc" } },
          variants: {
            orderBy: [{ color: { name: "asc" } }, { size: { name: "asc" } }],
            include: {
              color: true,
              size: true,
              medias: { orderBy: { sortOrder: "asc" } },
            },
          },
        },
      });
    });

    await recordAdminActivity({
      action: `Created product ${product.title}`,
      entityType: "product",
      entityId: product.id,
      actor: auth.access.name,
      metadata: { sku: product.sku, status: product.status, variantCount: product.variants.length },
    });

    return NextResponse.json({ product: mapAdminProduct(product) }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create product";
    const status = message.includes("Unique constraint failed") ? 409 : 500;
    return NextResponse.json({ message }, { status });
  }
}
