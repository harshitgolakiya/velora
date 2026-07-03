import { NextResponse } from "next/server";
import { z } from "zod";
import { queueAutomationEvent } from "@/lib/automation-events";
import { checkAuthRateLimit } from "@/lib/auth-rate-limit";
import { syncMarketingSubscriber } from "@/lib/marketing-sync";
import { createNewsletterToken, defaultNewsletterPreferences } from "@/lib/newsletter-consent";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  email: z.email(),
  locale: z.string().trim().min(2).max(10).default("en"),
  source: z.string().trim().min(2).max(40).default("storefront"),
  website: z.string().max(0).optional(),
});

export async function POST(request: Request) {
  const form = await request.formData();
  const parsed = schema.safeParse({
    email: form.get("email"),
    locale: form.get("locale") || "en",
    source: form.get("source") || "storefront",
    website: form.get("website") || "",
  });

  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "Enter a valid email address." }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const clientKey = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? email;
  if (!checkAuthRateLimit(`newsletter:${clientKey}`, { limit: 8, windowMs: 60 * 60_000 }).allowed) {
    return NextResponse.json({ ok: false, message: "Too many attempts. Please try again later." }, { status: 429 });
  }

  const existing = await prisma.newsletterSubscriber.findUnique({ where: { email } });
  const now = new Date();
  const subscriber = await prisma.newsletterSubscriber.upsert({
    where: { email },
    create: {
      email,
      locale: parsed.data.locale,
      source: parsed.data.source,
      consentSource: parsed.data.source,
      preferences: JSON.stringify(defaultNewsletterPreferences),
      status: "SUBSCRIBED",
    },
    update: {
      locale: parsed.data.locale,
      source: parsed.data.source,
      consentSource: parsed.data.source,
      consentAt: now,
      subscribedAt: existing?.status === "SUBSCRIBED" ? undefined : now,
      unsubscribedAt: null,
      suppressionReason: null,
      status: "SUBSCRIBED",
    },
  });

  const integrations = await syncMarketingSubscriber(subscriber.email);
  const syncFailed = integrations.some((integration) => integration.status === "FAILED");
  await prisma.newsletterSubscriber.update({
    where: { id: subscriber.id },
    data: {
      lastSyncAt: now,
      lastSyncStatus: syncFailed ? "PARTIAL_FAILURE" : "SYNCED",
    },
  });
  if (!existing || existing.status !== "SUBSCRIBED") {
    await queueAutomationEvent({
      type: "WELCOME",
      sourceKey: `welcome:${subscriber.id}`,
      recipient: subscriber.email,
      metadata: { locale: subscriber.locale, source: subscriber.source },
    });
  }

  const reactivated = Boolean(existing && existing.status !== "SUBSCRIBED");
  return NextResponse.json({
    ok: true,
    state: reactivated ? "REACTIVATED" : existing ? "ALREADY_SUBSCRIBED" : "SUBSCRIBED",
    message: reactivated
      ? "Your email preferences are active again."
      : existing
        ? "You are already subscribed. Your preferences are unchanged."
        : "You are subscribed. Welcome to the list.",
    email: subscriber.email,
    preferencesUrl: `/email-preferences?token=${encodeURIComponent(createNewsletterToken(subscriber.email))}`,
    integrations,
  });
}
