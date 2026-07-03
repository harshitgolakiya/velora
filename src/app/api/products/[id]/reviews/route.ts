import { NextResponse } from "next/server";
import { z } from "zod";
import { requireCustomerSession } from "@/lib/account-data";
import { checkAuthRateLimit } from "@/lib/auth-rate-limit";
import { prisma } from "@/lib/prisma";
import { canEditReview, getReviewEditableUntil } from "@/lib/review-policy";

const schema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().min(3).max(100),
  body: z.string().trim().min(20).max(2000),
});

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireCustomerSession();
  if (!session?.user?.id) return NextResponse.json({ review: null });
  const { id: productId } = await params;
  const review = await prisma.review.findUnique({
    where: { productId_userId: { productId, userId: session.user.id } },
    include: { media: { orderBy: { createdAt: "asc" } } },
  });
  return NextResponse.json({
    review: review ? {
      id: review.id,
      rating: review.rating,
      title: review.title,
      body: review.body,
      status: review.status,
      editableUntil: review.editableUntil?.toISOString(),
      canEdit: canEditReview(review.editableUntil),
      media: review.media.map((media) => ({
        id: media.id,
        status: media.status,
        originalName: media.originalName,
        url: `/api/reviews/media/${media.id}`,
      })),
    } : null,
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireCustomerSession();
  if (!session?.user?.id || !session.user.email) return NextResponse.json({ message: "Sign in to write a review." }, { status: 401 });
  const { id: productId } = await params;
  if (!checkAuthRateLimit(`review:${session.user.id}:${productId}`, { limit: 5, windowMs: 60 * 60 * 1000 }).allowed) {
    return NextResponse.json({ message: "Too many review attempts. Try again later." }, { status: 429 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Check your review details.", errors: parsed.error.flatten() }, { status: 400 });

  const [product, deliveredOrder] = await Promise.all([
    prisma.product.findFirst({ where: { id: productId, status: "PUBLISHED" }, select: { id: true } }),
    prisma.order.findFirst({
      where: {
        OR: [{ userId: session.user.id }, { email: session.user.email }],
        status: "DELIVERED",
        items: { some: { productId } },
      },
      select: { id: true },
    }),
  ]);
  if (!product) return NextResponse.json({ message: "Product not found." }, { status: 404 });
  if (!deliveredOrder) return NextResponse.json({ message: "Reviews are available after a delivered purchase." }, { status: 403 });

  const existing = await prisma.review.findUnique({
    where: { productId_userId: { productId, userId: session.user.id } },
    select: { id: true, createdAt: true, editableUntil: true },
  });
  const editableUntil = existing?.editableUntil ?? getReviewEditableUntil(existing?.createdAt);
  if (existing && !canEditReview(editableUntil)) {
    return NextResponse.json({ message: "The seven-day review edit window has closed." }, { status: 409 });
  }

  const review = await prisma.review.upsert({
    where: { productId_userId: { productId, userId: session.user.id } },
    create: {
      productId,
      userId: session.user.id,
      rating: parsed.data.rating,
      title: parsed.data.title,
      body: parsed.data.body,
      status: "PENDING",
      verifiedPurchase: true,
      editableUntil,
      events: { create: { action: "SUBMITTED", actor: session.user.email } },
    },
    update: {
      rating: parsed.data.rating,
      title: parsed.data.title,
      body: parsed.data.body,
      status: "PENDING",
      verifiedPurchase: true,
      editableUntil,
      adminResponse: null,
      respondedAt: null,
      events: { create: { action: "EDITED", actor: session.user.email, message: "Customer updated review during edit window" } },
    },
    select: { id: true, status: true, editableUntil: true },
  });

  return NextResponse.json({ review, message: "Review submitted for moderation." }, { status: 201 });
}
