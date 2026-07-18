import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireSameOriginRequest } from "@/lib/request-security";

const eventSchema = z.object({
  sourceProductId: z.string().trim().min(1).max(80),
  recommendedProductId: z.string().trim().min(1).max(80),
  strategy: z.string().trim().min(1).max(40).default("RELATED_SCORE"),
  eventType: z.enum(["IMPRESSION", "CLICK", "DISMISS"]),
  placement: z.string().trim().min(1).max(40).default("product_page"),
  sessionKey: z.string().trim().min(8).max(120).optional(),
});

export async function POST(request: Request) {
  const originError = requireSameOriginRequest(request);
  if (originError) return originError;

  const parsed = eventSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || parsed.data.sourceProductId === parsed.data.recommendedProductId) {
    return NextResponse.json({ message: "Invalid recommendation event" }, { status: 400 });
  }

  const productCount = await prisma.product.count({
    where: {
      id: { in: [parsed.data.sourceProductId, parsed.data.recommendedProductId] },
      status: "PUBLISHED",
    },
  });
  if (productCount !== 2) {
    return NextResponse.json({ message: "Recommendation products not found" }, { status: 404 });
  }

  const session = await getServerSession(authOptions);
  await prisma.recommendationEvent.create({
    data: {
      ...parsed.data,
      userId: session?.user?.id,
    },
  });

  return NextResponse.json({ recorded: true }, { status: 201 });
}
