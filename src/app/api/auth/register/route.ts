import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { checkAuthRateLimit } from "@/lib/auth-rate-limit";
import { accountActionUrl, issueAccountToken } from "@/lib/account-tokens";
import { sendVerificationEmail } from "@/lib/account-security-email";
import { localeFromRequest } from "@/lib/transactional-email";
import { passwordSchema } from "@/lib/password-policy";
import { prisma } from "@/lib/prisma";

const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.email().transform((email) => email.toLowerCase().trim()),
  password: passwordSchema,
});

export async function POST(request: Request) {
  const locale = localeFromRequest(request);
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const clientKey = forwardedFor || request.headers.get("x-real-ip") || "unknown";
  const rateLimit = checkAuthRateLimit(`register:${clientKey}`, {
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { message: "Too many account attempts. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(
            Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000)),
          ),
        },
      },
    );
  }

  const parsed = registerSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Check your account details", errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true, email: true, emailVerifiedAt: true },
  });
  if (existing) {
    if (!existing.emailVerifiedAt) {
      const { token } = await issueAccountToken({
        userId: existing.id,
        type: "EMAIL_VERIFICATION",
        expiresInMs: 24 * 60 * 60 * 1000,
      });
      await sendVerificationEmail(existing.email, accountActionUrl("/account/verify-email", token, locale), locale);
      return NextResponse.json({ created: true, verificationRequired: true }, { status: 201 });
    }
    return NextResponse.json({ created: true }, { status: 201 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
      role: "CUSTOMER",
      preferredLocale: locale,
    },
  });

  const { token } = await issueAccountToken({
    userId: user.id,
    type: "EMAIL_VERIFICATION",
    expiresInMs: 24 * 60 * 60 * 1000,
  });
  await sendVerificationEmail(user.email, accountActionUrl("/account/verify-email", token, locale), locale);

  return NextResponse.json({ created: true, verificationRequired: true }, { status: 201 });
}
