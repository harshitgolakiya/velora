import { NextResponse } from "next/server";
import { z } from "zod";
import { syncMarketingSubscriber, syncMarketingUnsubscriber } from "@/lib/marketing-sync";
import { parseNewsletterPreferences, verifyNewsletterToken } from "@/lib/newsletter-consent";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  token: z.string().min(20),
  status: z.enum(["SUBSCRIBED", "UNSUBSCRIBED"]),
  preferences: z.object({
    editorial: z.boolean(),
    product: z.boolean(),
    offers: z.boolean(),
  }),
});

function tokenFrom(request: Request) {
  return new URL(request.url).searchParams.get("token") ?? "";
}

export async function GET(request: Request) {
  const verified = verifyNewsletterToken(tokenFrom(request));
  if (!verified) return NextResponse.json({ message: "This preferences link is invalid or expired." }, { status: 400 });
  const subscriber = await prisma.newsletterSubscriber.findUnique({ where: { email: verified.email } });
  if (!subscriber) return NextResponse.json({ message: "Subscription not found." }, { status: 404 });
  return NextResponse.json({
    email: subscriber.email,
    status: subscriber.status,
    preferences: parseNewsletterPreferences(subscriber.preferences),
  });
}

export async function PUT(request: Request) {
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Check your communication preferences." }, { status: 400 });
  const verified = verifyNewsletterToken(parsed.data.token);
  if (!verified) return NextResponse.json({ message: "This preferences link is invalid or expired." }, { status: 400 });

  const now = new Date();
  const subscriber = await prisma.newsletterSubscriber.update({
    where: { email: verified.email },
    data: {
      status: parsed.data.status,
      preferences: JSON.stringify(parsed.data.preferences),
      consentAt: parsed.data.status === "SUBSCRIBED" ? now : undefined,
      subscribedAt: parsed.data.status === "SUBSCRIBED" ? now : undefined,
      unsubscribedAt: parsed.data.status === "UNSUBSCRIBED" ? now : null,
      suppressionReason: parsed.data.status === "UNSUBSCRIBED" ? "CUSTOMER_UNSUBSCRIBED" : null,
    },
  });
  const integrations = parsed.data.status === "SUBSCRIBED"
    ? await syncMarketingSubscriber(subscriber.email)
    : await syncMarketingUnsubscriber(subscriber.email);
  const syncFailed = integrations.some((integration) => integration.status === "FAILED");
  await prisma.newsletterSubscriber.update({
    where: { id: subscriber.id },
    data: { lastSyncAt: now, lastSyncStatus: syncFailed ? "PARTIAL_FAILURE" : "SYNCED" },
  });

  return NextResponse.json({
    email: subscriber.email,
    status: subscriber.status,
    preferences: parsed.data.preferences,
    message: subscriber.status === "SUBSCRIBED" ? "Preferences saved." : "You have been unsubscribed.",
    integrations,
  });
}
