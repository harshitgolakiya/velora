import { createHmac, timingSafeEqual } from "node:crypto";

export type NewsletterPreferences = {
  editorial: boolean;
  product: boolean;
  offers: boolean;
};

export const defaultNewsletterPreferences: NewsletterPreferences = {
  editorial: true,
  product: true,
  offers: true,
};

function tokenSecret() {
  const secret = process.env.NEWSLETTER_TOKEN_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEWSLETTER_TOKEN_SECRET or NEXTAUTH_SECRET must be configured");
  return secret;
}

function signature(payload: string) {
  return createHmac("sha256", tokenSecret()).update(payload).digest("base64url");
}

export function createNewsletterToken(email: string, expiresInDays = 365) {
  const expiresAt = Date.now() + expiresInDays * 24 * 60 * 60_000;
  const payload = Buffer.from(`${email.trim().toLowerCase()}\n${expiresAt}`).toString("base64url");
  return `${payload}.${signature(payload)}`;
}

export function verifyNewsletterToken(token: string) {
  const [payload, suppliedSignature] = token.split(".");
  if (!payload || !suppliedSignature) return null;
  const expectedSignature = signature(payload);
  const supplied = Buffer.from(suppliedSignature);
  const expected = Buffer.from(expectedSignature);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;

  try {
    const [email, expiresAtRaw] = Buffer.from(payload, "base64url").toString("utf8").split("\n");
    const expiresAt = Number(expiresAtRaw);
    if (!email || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) return null;
    return { email, expiresAt: new Date(expiresAt) };
  } catch {
    return null;
  }
}

export function parseNewsletterPreferences(value?: string | null): NewsletterPreferences {
  try {
    const parsed = JSON.parse(value ?? "") as Partial<NewsletterPreferences>;
    return {
      editorial: parsed.editorial !== false,
      product: parsed.product !== false,
      offers: parsed.offers !== false,
    };
  } catch {
    return { ...defaultNewsletterPreferences };
  }
}
