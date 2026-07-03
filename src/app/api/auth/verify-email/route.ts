import { NextResponse } from "next/server";
import { z } from "zod";
import { findValidAccountToken } from "@/lib/account-tokens";
import { checkAuthRateLimit } from "@/lib/auth-rate-limit";
import { prisma } from "@/lib/prisma";

const schema = z.object({ token: z.string().min(20).max(200) });

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "This verification link is invalid." }, { status: 400 });
  if (!checkAuthRateLimit(`verify-email:${parsed.data.token}`, { limit: 8, windowMs: 60 * 60 * 1000 }).allowed) {
    return NextResponse.json({ message: "This link cannot be used right now." }, { status: 429 });
  }

  const accountToken = await findValidAccountToken(parsed.data.token, "EMAIL_VERIFICATION");
  if (!accountToken) return NextResponse.json({ message: "This verification link is invalid or has expired." }, { status: 400 });

  try {
    await prisma.$transaction(async (transaction) => {
      const claimed = await transaction.accountToken.updateMany({
        where: { id: accountToken.id, usedAt: null, expiresAt: { gt: new Date() } },
        data: { usedAt: new Date() },
      });
      if (claimed.count !== 1) throw new Error("TOKEN_ALREADY_USED");
      await transaction.user.update({ where: { id: accountToken.userId }, data: { emailVerifiedAt: new Date() } });
    });
  } catch {
    return NextResponse.json({ message: "This verification link is invalid or has expired." }, { status: 400 });
  }

  return NextResponse.json({ verified: true });
}
