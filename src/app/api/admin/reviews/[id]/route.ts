import { NextResponse } from "next/server";
import { z } from "zod";
import { recordAdminActivity } from "@/lib/admin-activity";
import { requireAdminApiPermission } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
  adminResponse: z.string().trim().max(1000).optional().nullable(),
  media: z.array(z.object({
    id: z.string().min(1),
    status: z.enum(["PENDING", "APPROVED", "REJECTED"]),
    altText: z.string().trim().max(180).optional().nullable(),
  })).max(10).optional(),
  reports: z.array(z.object({
    id: z.string().min(1),
    status: z.enum(["OPEN", "RESOLVED", "DISMISSED"]),
  })).max(50).optional(),
}).refine((value) => Object.keys(value).length > 0);

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApiPermission("catalog:write");
  if ("response" in auth) return auth.response;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Invalid review moderation update." }, { status: 400 });
  const { id } = await params;
  try {
    const review = await prisma.$transaction(async (tx) => {
      const current = await tx.review.findUnique({ where: { id }, select: { id: true, productId: true } });
      if (!current) throw new Error("Review not found");
      if (parsed.data.media?.length) {
        for (const media of parsed.data.media) {
          await tx.reviewMedia.updateMany({
            where: { id: media.id, reviewId: id },
            data: { status: media.status, altText: media.altText || null },
          });
        }
      }
      if (parsed.data.reports?.length) {
        for (const report of parsed.data.reports) {
          await tx.reviewReport.updateMany({ where: { id: report.id, reviewId: id }, data: { status: report.status } });
        }
      }
      const responseProvided = parsed.data.adminResponse !== undefined;
      return tx.review.update({
        where: { id },
        data: {
          status: parsed.data.status,
          adminResponse: responseProvided ? parsed.data.adminResponse?.trim() || null : undefined,
          respondedAt: responseProvided ? (parsed.data.adminResponse?.trim() ? new Date() : null) : undefined,
          events: {
            create: {
              action: parsed.data.status ? `STATUS_${parsed.data.status}` : responseProvided ? "ADMIN_RESPONSE" : "MODERATION_UPDATED",
              actor: auth.access.email,
              message: parsed.data.adminResponse?.trim() || undefined,
              metadata: JSON.stringify({ media: parsed.data.media?.length ?? 0, reports: parsed.data.reports?.length ?? 0 }),
            },
          },
        },
        include: { media: true, reports: true, events: { orderBy: { createdAt: "desc" }, take: 20 } },
      });
    });
    await recordAdminActivity({
      action: parsed.data.status
        ? `${parsed.data.status === "APPROVED" ? "Approved" : parsed.data.status === "REJECTED" ? "Rejected" : "Reopened"} product review`
        : "Updated product review moderation",
      entityType: "review",
      entityId: review.id,
      actor: auth.access.name,
      metadata: { status: review.status, productId: review.productId, mediaCount: parsed.data.media?.length ?? 0, reportCount: parsed.data.reports?.length ?? 0 },
    });
    return NextResponse.json({ review });
  } catch {
    return NextResponse.json({ message: "Review not found." }, { status: 404 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApiPermission("catalog:write");
  if ("response" in auth) return auth.response;
  const { id } = await params;
  try {
    const review = await prisma.review.delete({ where: { id } });
    await recordAdminActivity({ action: "Deleted product review", entityType: "review", entityId: review.id, actor: auth.access.name, metadata: { productId: review.productId } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ message: "Review not found." }, { status: 404 });
  }
}
