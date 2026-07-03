import { NextResponse } from "next/server";
import { ProductStatus } from "@prisma/client";
import { z } from "zod";
import { recordAdminActivity } from "@/lib/admin-activity";
import { requireAdminApiPermission } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  status: z.enum(["DRAFT", "SCHEDULED", "PUBLISHED", "ARCHIVED"]),
  scheduledAt: z.string().datetime().optional().nullable(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApiPermission("catalog:write");
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const parsed = schema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid status value" }, { status: 400 });
  }

  try {
    const now = new Date();
    const scheduledAt = parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : null;
    if (parsed.data.status === "SCHEDULED" && (!scheduledAt || scheduledAt <= now)) {
      return NextResponse.json({ message: "Scheduled publish time must be in the future" }, { status: 400 });
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        status: parsed.data.status as ProductStatus,
        scheduledAt: parsed.data.status === "SCHEDULED" ? scheduledAt : null,
        publishedAt: parsed.data.status === "PUBLISHED" ? now : parsed.data.status === "DRAFT" ? null : undefined,
      },
      select: { id: true, title: true, status: true, scheduledAt: true },
    });
    await recordAdminActivity({
      action:
        product.status === "SCHEDULED"
          ? `Scheduled product ${product.title} for publishing`
          : `Changed product ${product.title} status to ${product.status}`,
      entityType: "product",
      entityId: product.id,
      actor: auth.access.name,
      metadata: { status: product.status, scheduledAt: product.scheduledAt?.toISOString() },
    });
    return NextResponse.json({
      ok: true,
      status: product.status,
      scheduledAt: product.scheduledAt?.toISOString() ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update status";
    const statusCode = message.includes("Record to update not found") ? 404 : 500;
    return NextResponse.json({ message }, { status: statusCode });
  }
}
