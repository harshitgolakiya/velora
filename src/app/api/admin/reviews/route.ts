import { NextResponse } from "next/server";
import { requireAdminApiPermission } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const auth = await requireAdminApiPermission("admin:read");
  if ("response" in auth) return auth.response;
  const status = new URL(request.url).searchParams.get("status");
  const reviews = await prisma.review.findMany({
    where: status && ["PENDING", "APPROVED", "REJECTED"].includes(status) ? { status } : undefined,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      user: { select: { id: true, name: true, email: true } },
      product: { select: { id: true, title: true, slug: true } },
    },
  });
  return NextResponse.json({ reviews });
}
