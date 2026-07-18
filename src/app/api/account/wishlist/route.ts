import { NextResponse } from "next/server";
import { ProductStatus } from "@prisma/client";
import { z } from "zod";
import { requireCustomerSession } from "@/lib/account-data";
import { prisma } from "@/lib/prisma";
import { requireSameOriginRequest } from "@/lib/request-security";

const wishlistSchema = z.object({
  slugs: z.array(z.string().trim().min(1).max(180)).max(200).default([]),
  items: z.array(z.object({
    slug: z.string().trim().min(1).max(180),
    variantId: z.string().trim().optional(),
    color: z.string().trim().max(100).optional(),
    size: z.string().trim().max(100).optional(),
  })).max(200).default([]),
});

async function getWishlistId(userId: string) {
  const wishlist = await prisma.wishlist.upsert({
    where: { userId },
    create: { userId },
    update: {},
    select: { id: true },
  });

  return wishlist.id;
}

export async function GET() {
  const session = await requireCustomerSession();
  if (!session?.user.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const wishlist = await prisma.wishlist.findUnique({
    where: { userId: session.user.id },
    include: {
      items: {
        include: {
          product: {
            select: {
              slug: true,
              status: true,
              variants: { select: { id: true, color: { select: { name: true } }, size: { select: { name: true } } } },
            },
          },
        },
      },
    },
  });

  return NextResponse.json({
    slugs: wishlist?.items
        .filter((item) => item.product.status === ProductStatus.PUBLISHED)
        .map((item) => item.product.slug) ?? [],
    items: wishlist?.items
      .filter((item) => item.product.status === ProductStatus.PUBLISHED)
      .map((item) => ({
        slug: item.product.slug,
        variantId: item.variantId,
        color: item.color,
        size: item.size,
      })) ?? [],
  });
}

export async function PUT(request: Request) {
  const originError = requireSameOriginRequest(request);
  if (originError) return originError;

  const session = await requireCustomerSession();
  if (!session?.user.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = wishlistSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Check wishlist items", errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const requestedItems: Array<{ slug: string; variantId?: string; color?: string; size?: string }> = parsed.data.items.length
    ? parsed.data.items
    : parsed.data.slugs.map((slug) => ({ slug }));
  const uniqueSlugs = Array.from(new Set(requestedItems.map((item) => item.slug)));
  const products = uniqueSlugs.length
    ? await prisma.product.findMany({
        where: {
          slug: { in: uniqueSlugs },
          status: ProductStatus.PUBLISHED,
        },
        select: {
          id: true,
          slug: true,
          variants: { select: { id: true, color: { select: { name: true } }, size: { select: { name: true } } } },
        },
      })
    : [];
  const wishlistId = await getWishlistId(session.user.id);

  await prisma.wishlistItem.deleteMany({ where: { wishlistId } });
  if (products.length) {
    const requestedBySlug = new Map(requestedItems.map((item) => [item.slug, item]));
    await prisma.wishlistItem.createMany({
      data: products.map((product) => {
        const requested = requestedBySlug.get(product.slug);
        const variant = requested?.variantId
          ? product.variants.find((candidate) => candidate.id === requested.variantId)
          : product.variants.find((candidate) => candidate.color.name === requested?.color && candidate.size.name === requested?.size);
        return {
          wishlistId,
          productId: product.id,
          variantId: variant?.id,
          color: variant?.color.name ?? requested?.color,
          size: variant?.size.name ?? requested?.size,
        };
      }),
    });
  }

  return NextResponse.json({
    slugs: products.map((product) => product.slug),
    items: products.map((product) => {
      const requested = requestedItems.find((item) => item.slug === product.slug);
      const variant = requested?.variantId
        ? product.variants.find((candidate) => candidate.id === requested.variantId)
        : product.variants.find((candidate) => candidate.color.name === requested?.color && candidate.size.name === requested?.size);
      return { slug: product.slug, variantId: variant?.id ?? null, color: variant?.color.name ?? requested?.color ?? null, size: variant?.size.name ?? requested?.size ?? null };
    }),
  });
}
