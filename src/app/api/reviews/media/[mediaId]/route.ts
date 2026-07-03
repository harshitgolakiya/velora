import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readReviewMedia } from "@/lib/review-media-storage";

export async function GET(_request: Request, { params }: { params: Promise<{ mediaId: string }> }) {
  const { mediaId } = await params;
  const media = await prisma.reviewMedia.findUnique({
    where: { id: mediaId },
    include: { review: { select: { userId: true, status: true } } },
  });
  if (!media) return new Response("Not found", { status: 404 });
  if (media.status !== "APPROVED" || media.review.status !== "APPROVED") {
    const session = await getServerSession(authOptions);
    const isOwner = session?.user?.id === media.review.userId;
    const isAdmin = session?.user?.role && session.user.role !== "CUSTOMER";
    if (!isOwner && !isAdmin) return new Response("Not found", { status: 404 });
  }
  try {
    const bytes = await readReviewMedia(media.storageKey);
    return new Response(bytes, {
      headers: {
        "Content-Type": media.mimeType,
        "Content-Length": String(bytes.byteLength),
        "Cache-Control": media.status === "APPROVED" ? "public, max-age=86400" : "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
