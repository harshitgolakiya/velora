import { NextResponse } from "next/server";
import { z } from "zod";
import { recordAdminActivity } from "@/lib/admin-activity";
import { requireAdminApiPermission } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import { appendPrivacyAuditLog } from "@/lib/privacy-requests";

const schema = z.object({
  status: z.enum(["PENDING", "ON_HOLD", "PROCESSING", "COMPLETED", "REJECTED"]).optional(),
  legalHold: z.boolean().optional(),
  notes: z.string().trim().max(1000).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApiPermission("orders:write");
  if ("response" in auth) return auth.response;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid privacy request payload", errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { id } = await params;
  const existing = await prisma.privacyRequest.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ message: "Privacy request not found" }, { status: 404 });

  const nextStatus = parsed.data.status ?? existing.status;
  const now = new Date();
  const updated = await prisma.privacyRequest.update({
    where: { id },
    data: {
      status: nextStatus,
      legalHold: parsed.data.legalHold ?? existing.legalHold,
      notes: parsed.data.notes !== undefined ? parsed.data.notes || null : existing.notes,
      completedAt: nextStatus === "COMPLETED" ? existing.completedAt ?? now : existing.completedAt,
      rejectedAt: nextStatus === "REJECTED" ? existing.rejectedAt ?? now : existing.rejectedAt,
      auditLog: appendPrivacyAuditLog(existing.auditLog, {
        at: now,
        actor: auth.access.name,
        action: "ADMIN_UPDATED",
        message: JSON.stringify({
          previousStatus: existing.status,
          nextStatus,
          previousLegalHold: existing.legalHold,
          nextLegalHold: parsed.data.legalHold ?? existing.legalHold,
        }),
      }),
    },
  });

  await recordAdminActivity({
    action: `Updated privacy request ${updated.id}`,
    entityType: "privacy_request",
    entityId: updated.id,
    actor: auth.access.name,
    metadata: {
      email: updated.email,
      type: updated.type,
      previousStatus: existing.status,
      nextStatus: updated.status,
      previousLegalHold: existing.legalHold,
      nextLegalHold: updated.legalHold,
    },
  });

  return NextResponse.json({
    request: {
      id: updated.id,
      email: updated.email,
      type: updated.type,
      status: updated.status,
      legalHold: updated.legalHold,
      retentionUntil: updated.retentionUntil?.toISOString(),
      completedAt: updated.completedAt?.toISOString(),
      rejectedAt: updated.rejectedAt?.toISOString(),
      notes: updated.notes ?? undefined,
    },
  });
}
