import { NextResponse } from "next/server";
import { z } from "zod";
import { recordAdminActivity } from "@/lib/admin-activity";
import { requireAdminApiPermission } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "WAITING_CUSTOMER", "RESOLVED", "CLOSED"]),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]),
  assignedTo: z.string().trim().max(120).optional().nullable(),
  adminNote: z.string().trim().max(3000).optional().nullable(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApiPermission("orders:write");
  if ("response" in auth) return auth.response;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Check support case fields" }, { status: 400 });
  const { id } = await params;
  try {
    const supportCase = await prisma.supportCase.update({
      where: { id },
      data: { ...parsed.data, assignedTo: parsed.data.assignedTo || null, adminNote: parsed.data.adminNote || null },
      include: { order: { select: { orderNumber: true, status: true } } },
    });
    await recordAdminActivity({ actor: auth.access.email, action: "support_case.updated", entityType: "SupportCase", entityId: id, metadata: { caseNumber: supportCase.caseNumber, status: supportCase.status, priority: supportCase.priority, assignedTo: supportCase.assignedTo } });
    return NextResponse.json({ supportCase });
  } catch {
    return NextResponse.json({ message: "Support case not found" }, { status: 404 });
  }
}
