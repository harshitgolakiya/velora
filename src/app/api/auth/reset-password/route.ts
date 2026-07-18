import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { findValidAccountToken } from "@/lib/account-tokens";
import { checkAuthRateLimit } from "@/lib/auth-rate-limit";
import { passwordSchema } from "@/lib/password-policy";
import { prisma } from "@/lib/prisma";
import { requireSameOriginRequest } from "@/lib/request-security";

const schema = z.object({ token: z.string().min(20).max(200), password: passwordSchema });

export async function POST(request: Request) {
  const originError = requireSameOriginRequest(request);
  if (originError) return originError;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Check the password requirements." }, { status: 400 });
  if (!checkAuthRateLimit(`reset-password:${parsed.data.token}`, { limit: 5, windowMs: 60 * 60 * 1000 }).allowed) {
    return NextResponse.json({ message: "This link cannot be used right now." }, { status: 429 });
  }

  const accountToken = await findValidAccountToken(parsed.data.token, "PASSWORD_RESET");
  if (!accountToken) return NextResponse.json({ message: "This reset link is invalid or has expired." }, { status: 400 });

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  try {
    await prisma.$transaction(async (transaction) => {
      const claimed = await transaction.accountToken.updateMany({
        where: { id: accountToken.id, usedAt: null, expiresAt: { gt: new Date() } },
        data: { usedAt: new Date() },
      });
      if (claimed.count !== 1) throw new Error("TOKEN_ALREADY_USED");
      await transaction.user.update({ where: { id: accountToken.userId }, data: { passwordHash } });
      await transaction.accountToken.deleteMany({ where: { userId: accountToken.userId, type: "PASSWORD_RESET", id: { not: accountToken.id } } });
    });
  } catch {
    return NextResponse.json({ message: "This reset link is invalid or has expired." }, { status: 400 });
  }

  return NextResponse.json({ reset: true });
}
