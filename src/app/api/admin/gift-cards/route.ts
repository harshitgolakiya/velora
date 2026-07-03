import { NextResponse } from "next/server";
import { z } from "zod";
import { recordAdminActivity } from "@/lib/admin-activity";
import { requireAdminApiPermission } from "@/lib/admin-api";
import { createGiftCard } from "@/lib/gift-cards";
import { prisma } from "@/lib/prisma";

function mapGiftCard(card: Awaited<ReturnType<typeof prisma.giftCard.findMany>>[number]) {
  return {
    id: card.id,
    codeLast4: card.codeLast4,
    initialBalance: Number(card.initialBalance),
    balance: Number(card.balance),
    currency: card.currency,
    status: card.status,
    recipientEmail: card.recipientEmail ?? undefined,
    purchaserEmail: card.purchaserEmail ?? undefined,
    note: card.note ?? undefined,
    expiresAt: card.expiresAt?.toISOString(),
    issuedAt: card.issuedAt.toISOString(),
    createdAt: card.createdAt.toISOString(),
  };
}

export async function GET() {
  const auth = await requireAdminApiPermission("marketing:write");
  if ("response" in auth) return auth.response;

  const giftCards = await prisma.giftCard.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return NextResponse.json({ giftCards: giftCards.map(mapGiftCard) });
}

const createSchema = z.object({
  amount: z.coerce.number().positive(),
  recipientEmail: z.email().optional().nullable(),
  purchaserEmail: z.email().optional().nullable(),
  note: z.string().trim().max(300).optional().nullable(),
  expiresAt: z.string().optional().nullable(),
});

export async function POST(request: Request) {
  const auth = await requireAdminApiPermission("marketing:write");
  if ("response" in auth) return auth.response;

  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid gift-card payload", errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const result = await createGiftCard({
    amount: parsed.data.amount,
    recipientEmail: parsed.data.recipientEmail,
    purchaserEmail: parsed.data.purchaserEmail,
    note: parsed.data.note,
    expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
    actor: auth.access.name,
  });

  await recordAdminActivity({
    action: `Issued gift card ending ${result.giftCard.codeLast4}`,
    entityType: "gift_card",
    entityId: result.giftCard.id,
    actor: auth.access.name,
    metadata: { amount: parsed.data.amount, recipientEmail: parsed.data.recipientEmail },
  });

  return NextResponse.json({
    giftCard: mapGiftCard(result.giftCard),
    code: result.code,
  }, { status: 201 });
}
