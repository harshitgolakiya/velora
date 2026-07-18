import { NextResponse } from "next/server";
import { z } from "zod";
import { requireCustomerSession } from "@/lib/account-data";
import { checkAuthRateLimit } from "@/lib/auth-rate-limit";
import { prisma } from "@/lib/prisma";
import { requireSameOriginRequest } from "@/lib/request-security";

const schema = z.object({
  reason: z.enum(["SPAM", "OFFENSIVE", "PRIVACY", "MISLEADING", "OTHER"]),
  details: z.string().trim().max(500).optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const originError = requireSameOriginRequest(request);
  if (originError) return originError;

  const session = await requireCustomerSession();
  if (!session?.user?.id || !session.user.email) return NextResponse.json({ message: "Sign in to report a review." }, { status: 401 });
  const { id } = await params;
  if (!checkAuthRateLimit(`review-report:${session.user.id}`, { limit: 10, windowMs: 60 * 60_000 }).allowed) {
    return NextResponse.json({ message: "Too many reports. Try again later." }, { status: 429 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Choose a report reason." }, { status: 400 });
  const review = await prisma.review.findFirst({ where: { id, status: "APPROVED", userId: { not: session.user.id } }, select: { id: true } });
  if (!review) return NextResponse.json({ message: "Review not found." }, { status: 404 });
  await prisma.reviewReport.upsert({
    where: { reviewId_reporterId: { reviewId: id, reporterId: session.user.id } },
    create: { reviewId: id, reporterId: session.user.id, reporterEmail: session.user.email, ...parsed.data },
    update: { ...parsed.data, status: "OPEN" },
  });
  await prisma.reviewEvent.create({ data: { reviewId: id, action: "REPORTED", actor: session.user.email, message: parsed.data.reason } });
  return NextResponse.json({ reported: true, message: "Report received. Our moderation team will review it." }, { status: 201 });
}
