import { NextResponse } from "next/server";
import { z } from "zod";
import { accountActionUrl, issueAccountToken } from "@/lib/account-tokens";
import { sendVerificationEmail } from "@/lib/account-security-email";
import { checkAuthRateLimit } from "@/lib/auth-rate-limit";
import { prisma } from "@/lib/prisma";
import { requireSameOriginRequest } from "@/lib/request-security";
import { localeFromRequest } from "@/lib/transactional-email";

const schema = z.object({ email: z.email().transform((value) => value.toLowerCase().trim()) });
const genericResponse = { message: "If verification is required, a new link has been sent." };

export async function POST(request: Request) {
  const originError = requireSameOriginRequest(request);
  if (originError) return originError;

  const locale = localeFromRequest(request);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json(genericResponse);
  if (!checkAuthRateLimit(`resend-verification:${parsed.data.email}`, { limit: 3, windowMs: 60 * 60 * 1000 }).allowed) {
    return NextResponse.json(genericResponse);
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email }, select: { id: true, email: true, emailVerifiedAt: true } });
  if (user && !user.emailVerifiedAt) {
    const { token } = await issueAccountToken({ userId: user.id, type: "EMAIL_VERIFICATION", expiresInMs: 24 * 60 * 60 * 1000 });
    await sendVerificationEmail(user.email, accountActionUrl("/account/verify-email", token, locale), locale);
  }

  return NextResponse.json(genericResponse);
}
