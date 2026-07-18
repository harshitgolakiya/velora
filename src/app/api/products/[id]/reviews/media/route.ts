import { NextResponse } from "next/server";
import { requireCustomerSession } from "@/lib/account-data";
import { prisma } from "@/lib/prisma";
import { scanReturnEvidence } from "@/lib/return-malware-scan";
import { deleteReviewMedia, MAX_REVIEW_MEDIA_FILES, storeReviewMedia } from "@/lib/review-media-storage";
import { canEditReview } from "@/lib/review-policy";
import { requireSameOriginRequest } from "@/lib/request-security";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const originError = requireSameOriginRequest(request);
  if (originError) return originError;

  const session = await requireCustomerSession();
  if (!session?.user?.id || !session.user.email) return NextResponse.json({ message: "Sign in to upload review images." }, { status: 401 });
  const { id: productId } = await params;
  const review = await prisma.review.findUnique({
    where: { productId_userId: { productId, userId: session.user.id } },
    include: { media: true },
  });
  if (!review) return NextResponse.json({ message: "Submit the review before adding images." }, { status: 409 });
  if (!canEditReview(review.editableUntil)) {
    return NextResponse.json({ message: "The review edit window has closed." }, { status: 409 });
  }
  const form = await request.formData();
  const files = form.getAll("files").filter((entry): entry is File => entry instanceof File);
  if (!files.length) return NextResponse.json({ message: "Choose at least one image." }, { status: 400 });
  if (review.media.length + files.length > MAX_REVIEW_MEDIA_FILES) {
    return NextResponse.json({ message: `A maximum of ${MAX_REVIEW_MEDIA_FILES} review images is allowed.` }, { status: 400 });
  }

  const uploaded = [];
  try {
    for (const file of files) {
      await scanReturnEvidence(file);
      const stored = await storeReviewMedia(review.id, file);
      try {
        const media = await prisma.reviewMedia.create({
          data: {
            reviewId: review.id,
            storageKey: stored.storageKey,
            originalName: file.name.slice(0, 240),
            mimeType: stored.mimeType,
            sizeBytes: stored.bytes.byteLength,
          },
        });
        uploaded.push({ id: media.id, status: media.status, originalName: media.originalName, url: `/api/reviews/media/${media.id}` });
      } catch (error) {
        await deleteReviewMedia(stored.storageKey);
        throw error;
      }
    }
    await prisma.review.update({
      where: { id: review.id },
      data: {
        status: "PENDING",
        events: { create: { action: "MEDIA_ADDED", actor: session.user.email, message: `${uploaded.length} image(s) added` } },
      },
    });
    return NextResponse.json({ media: uploaded, message: "Review images uploaded for moderation." }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Unable to upload review images." }, { status: 400 });
  }
}
