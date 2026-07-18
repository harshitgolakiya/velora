import { NextResponse } from "next/server";
import { z } from "zod";
import { accountActionUrl, issueAccountToken } from "@/lib/account-tokens";
import { sendPasswordResetEmail } from "@/lib/account-security-email";
import { checkAuthRateLimit } from "@/lib/auth-rate-limit";
import { prisma } from "@/lib/prisma";
import { requireSameOriginRequest } from "@/lib/request-security";
import { localeFromRequest } from "@/lib/transactional-email";

const schema = z.object({ email: z.email().transform((value) => value.toLowerCase().trim()) });
const genericResponse = { message: "If an account exists, a password reset link has been sent." };

export async function POST(request: Request) {
  const originError = requireSameOriginRequest(request);
  if (originError) return originError;

  const locale = localeFromRequest(request);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json(genericResponse);

  const limit = checkAuthRateLimit(`forgot-password:${parsed.data.email}`, { limit: 3, windowMs: 60 * 60 * 1000 });
  if (!limit.allowed) return NextResponse.json(genericResponse);

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email }, select: { id: true, email: true, passwordHash: true } });
  if (user?.passwordHash) {
    const { token } = await issueAccountToken({ userId: user.id, type: "PASSWORD_RESET", expiresInMs: 60 * 60 * 1000 });
    await sendPasswordResetEmail(user.email, accountActionUrl("/account/reset-password", token, locale), locale);
  }

  return NextResponse.json(genericResponse);
}
