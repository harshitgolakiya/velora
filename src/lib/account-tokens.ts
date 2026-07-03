import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { localizedPath, type Locale } from "./i18n";
import { prisma } from "./prisma";

export type AccountTokenType = "EMAIL_VERIFICATION" | "PASSWORD_RESET";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function issueAccountToken({
  userId,
  type,
  expiresInMs,
}: {
  userId: string;
  type: AccountTokenType;
  expiresInMs: number;
}) {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + expiresInMs);

  await prisma.$transaction([
    prisma.accountToken.deleteMany({ where: { userId, type, usedAt: null } }),
    prisma.accountToken.create({ data: { userId, type, tokenHash, expiresAt } }),
  ]);

  return { token, expiresAt };
}

export async function findValidAccountToken(token: string, type: AccountTokenType) {
  if (!token || token.length > 200) return null;
  return prisma.accountToken.findFirst({
    where: {
      tokenHash: hashToken(token),
      type,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    include: { user: true },
  });
}

export function accountActionUrl(path: string, token: string, locale: Locale = "en") {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${siteUrl}${localizedPath(path, locale)}?token=${encodeURIComponent(token)}`;
}
