import { after, NextResponse } from "next/server";
import { MediaType, ProductStatus } from "@prisma/client";
import { recordAdminActivity } from "@/lib/admin-activity";
import { requireAdminApiPermission } from "@/lib/admin-api";
import { mapAdminProduct } from "@/lib/admin-catalog";
import { validateProductSkus } from "@/lib/admin-product-validation";
import { updateProductSchema } from "@/lib/admin-validation";
import { prisma } from "@/lib/prisma";
import { enqueuePriceDropAlerts, processProductAlertQueue } from "@/lib/product-alert-queue";
import { slugify } from "@/lib/utils";

async function ensureUniqueSlug(slug: string, productId: string) {
  const base = slugify(slug);
  let nextSlug = base;
  let suffix = 2;

  while (true) {
    const existing = await prisma.product.findUnique({ where: { slug: nextSlug } });
    if (!existing || existing.id === productId) return nextSlug;
    nextSlug = `${base}-${suffix}`;
    suffix += 1;
  }
}

function orderProductImages(colors: { images: string[] }[], primaryImage?: string) {
  const images = Array.from(new Set(colors.flatMap((color) => color.images).filter(Boolean)));
  if (!primaryImage || !images.includes(primaryImage)) return images;
  return [primaryImage, ...images.filter((image) => image !== primaryImage)];
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApiPermission("catalog:write");
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const parsed = updateProductSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid product payload", errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const slug = await ensureUniqueSlug(data.slug || data.name, id);
  const previousProduct = await prisma.product.findUnique({
    where: { id },
    select: { price: true, salePrice: true },
  });

  if (data.colors?.length && data.sizeNames?.length) {
    const skuError = await validateProductSkus({
      productId: id,
      productSku: data.sku,
      sizeNames: data.sizeNames,
      colors: data.colors,
    });

    if (skuError) {
      return NextResponse.json({ message: skuError }, { status: 409 });
    }
  }

  try {
    const product = await prisma.$transaction(async (tx) => {
      if (data.colors?.length && data.sizeNames?.length) {
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

        const existingVariants = await tx.productVariant.findMany({
          where: { productId: id },
          include: { color: true, size: true },
        });
        const existingByOption = new Map<string, typeof existingVariants>();
        for (const variant of existingVariants) {
          const key = `${variant.colorId}:${variant.sizeId}`;
          existingByOption.set(key, [...(existingByOption.get(key) ?? []), variant]);
        }

        const productImages = orderProductImages(data.colors, data.primaryImage);

        await tx.productImage.deleteMany({ where: { productId: id } });
        await tx.productImage.createMany({
          data: productImages
            .slice(0, 8)
            .map((url, position) => ({
              productId: id,
              url,
              alt: data.name,
              position,
            })),
        });

        const desiredVariants = data.colors.flatMap((colorInput, colorIndex) =>
          sizes.map((size) => {
            const color = colors[colorIndex];
            const key = `${color.id}:${size.id}`;
            const reusableVariant = existingByOption.get(key)?.shift();
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
              existingId: reusableVariant?.id,
              colorId: color.id,
              sizeId: size.id,
              sku:
                colorInput.skuBySize[size.name]?.trim() ||
                `${data.sku}-${size.name}-${colorInput.name}`.toUpperCase().replace(/\s+/g, "-"),
              stock: colorInput.stockBySize[size.name] ?? 0,
              media,
            };
          }),
        );

        const reusableVariantIds = new Set(
          desiredVariants
            .map((variant) => variant.existingId)
            .filter(Boolean) as string[],
        );
        const obsoleteVariantIds = existingVariants
          .filter((variant) => !reusableVariantIds.has(variant.id))
          .map((variant) => variant.id);

        if (obsoleteVariantIds.length) {
          await tx.variantMedia.deleteMany({ where: { variantId: { in: obsoleteVariantIds } } });
          await tx.cartItem.deleteMany({ where: { variantId: { in: obsoleteVariantIds } } });
          await tx.wishlistItem.updateMany({
            where: { variantId: { in: obsoleteVariantIds } },
            data: { variantId: null },
          });
          await tx.orderItem.updateMany({
            where: { variantId: { in: obsoleteVariantIds } },
            data: { variantId: null },
          });
          await tx.returnRequestItem.updateMany({
            where: { requestedVariantId: { in: obsoleteVariantIds } },
            data: { requestedVariantId: null },
          });
          await tx.productAlertSubscription.deleteMany({ where: { variantId: { in: obsoleteVariantIds } } });
          await tx.inventoryLog.deleteMany({ where: { variantId: { in: obsoleteVariantIds } } });
          await tx.productVariant.deleteMany({ where: { id: { in: obsoleteVariantIds }, productId: id } });
        }

        if (reusableVariantIds.size) {
          await tx.productVariant.updateMany({
            where: { id: { in: [...reusableVariantIds] } },
            data: { sku: null },
          });
        }

        await Promise.all(
          desiredVariants.map(async (variant) => {
            if (variant.existingId) {
              await tx.variantMedia.deleteMany({ where: { variantId: variant.existingId } });
              return tx.productVariant.update({
                where: { id: variant.existingId },
                data: {
                  colorId: variant.colorId,
                  sizeId: variant.sizeId,
                  sku: variant.sku,
                  stock: variant.stock,
                  medias: variant.media.length ? { create: variant.media } : undefined,
                },
              });
            }

            return tx.productVariant.create({
              data: {
                productId: id,
                colorId: variant.colorId,
                sizeId: variant.sizeId,
                sku: variant.sku,
                stock: variant.stock,
                medias: variant.media.length ? { create: variant.media } : undefined,
              },
            });
          }),
        );
      }

      return tx.product.update({
        where: { id },
        data: {
          title: data.name,
          slug,
          sku: data.sku,
          price: data.price,
          salePrice: data.salePrice ?? null,
          description: data.description,
          fabricDetails: data.fabricDetails,
          careInstructions: data.careInstructions,
          fitSummary: data.fitSummary?.trim() || null,
          modelReference: data.modelReference?.trim() || null,
          sizeAdvice: data.sizeAdvice?.trim() || null,
          dimensionNotes: JSON.stringify(data.dimensionNotes.filter(Boolean)),
          seoTitle: data.seoTitle?.trim() || null,
          seoDescription: data.seoDescription?.trim() || null,
          socialImage: data.socialImage?.trim() || null,
          status: data.status as ProductStatus,
          scheduledAt: data.status === "SCHEDULED" ? (data.scheduledAt ? new Date(data.scheduledAt) : undefined) : null,
          publishedAt: data.status === "PUBLISHED" ? new Date() : data.status === "DRAFT" ? null : undefined,
          featured: data.featured,
          bestSeller: data.bestSeller,
          newArrival: data.newArrival,
          categoryId: data.categoryId,
          collections: {
            set: data.collectionIds.map((collectionId) => ({ id: collectionId })),
          },
          tags: {
            set: data.tagIds.map((tagId) => ({ id: tagId })),
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
      action: `Updated product ${product.title}`,
      entityType: "product",
      entityId: product.id,
      actor: auth.access.name,
      metadata: { sku: product.sku, status: product.status, variantCount: product.variants.length },
    });

    if (previousProduct && product.status === ProductStatus.PUBLISHED) {
      const previousPrice = Number(previousProduct.salePrice ?? previousProduct.price);
      const nextPrice = Number(product.salePrice ?? product.price);
      await enqueuePriceDropAlerts({
        productId: product.id,
        previousPrice,
        nextPrice,
        transitionKey: product.updatedAt.toISOString(),
      });
      after(() => processProductAlertQueue().catch(() => undefined));
    }

    return NextResponse.json({ product: mapAdminProduct(product) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update product";
    const status = message.includes("Record to update not found")
      ? 404
      : message.includes("Unique constraint failed")
        ? 409
        : 500;
    return NextResponse.json({ message }, { status });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApiPermission("catalog:write");
  if ("response" in auth) return auth.response;

  const { id } = await params;

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          orderItems: true,
          cartItems: true,
          wishlistItems: true,
          reviews: true,
        },
      },
    },
  });

  if (!product) {
    return NextResponse.json({ message: "Product not found" }, { status: 404 });
  }

  const blockers = [
    product._count.orderItems ? `${product._count.orderItems} order item${product._count.orderItems !== 1 ? "s" : ""}` : "",
    product._count.cartItems ? `${product._count.cartItems} cart item${product._count.cartItems !== 1 ? "s" : ""}` : "",
    product._count.wishlistItems ? `${product._count.wishlistItems} wishlist item${product._count.wishlistItems !== 1 ? "s" : ""}` : "",
    product._count.reviews ? `${product._count.reviews} review${product._count.reviews !== 1 ? "s" : ""}` : "",
  ].filter(Boolean);

  if (blockers.length) {
    return NextResponse.json(
      {
        message: `This product has ${blockers.join(", ")}. Archive it instead of deleting so history stays intact.`,
      },
      { status: 409 },
    );
  }

  try {
    await prisma.product.delete({ where: { id } });

    await recordAdminActivity({
      action: `Deleted product ${product.title}`,
      entityType: "product",
      entityId: product.id,
      actor: auth.access.name,
      metadata: { sku: product.sku, slug: product.slug },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete product";
    return NextResponse.json({ message }, { status: 500 });
  }
}
