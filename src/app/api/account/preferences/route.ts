import { NextResponse } from "next/server";
import { z } from "zod";
import { requireCustomerSession } from "@/lib/account-data";
import { syncMarketingSubscriber, syncMarketingUnsubscriber } from "@/lib/marketing-sync";
import { prisma } from "@/lib/prisma";
import { requireSameOriginRequest } from "@/lib/request-security";

const preferencesSchema = z.object({
  marketingEmails: z.boolean(),
  productAlertEmails: z.boolean(),
  postPurchaseEmails: z.boolean(),
});

export async function PUT(request: Request) {
  const session = await requireCustomerSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const csrf = requireSameOriginRequest(request);
  if (csrf) return csrf;

  const parsed = preferencesSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Check your communication preferences." }, { status: 400 });

  const previous = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { marketingEmails: true, email: true },
  });
  if (!previous) return NextResponse.json({ message: "Account not found" }, { status: 404 });

  const preferences = await prisma.user.update({
    where: { id: session.user.id },
    data: parsed.data,
    select: { marketingEmails: true, productAlertEmails: true, postPurchaseEmails: true },
  });

  await prisma.productAlertSubscription.updateMany({
    where: { userId: session.user.id },
    data: { status: preferences.productAlertEmails ? "ACTIVE" : "PAUSED" },
  });

  let integrations = undefined;
  if (previous.marketingEmails !== preferences.marketingEmails) {
    const now = new Date();
    await prisma.newsletterSubscriber.upsert({
      where: { email: previous.email },
      create: {
        email: previous.email,
        source: "account-preferences",
        consentSource: "account-preferences",
        status: preferences.marketingEmails ? "SUBSCRIBED" : "UNSUBSCRIBED",
        unsubscribedAt: preferences.marketingEmails ? null : now,
        suppressionReason: preferences.marketingEmails ? null : "CUSTOMER_UNSUBSCRIBED",
      },
      update: {
        source: "account-preferences",
        consentSource: "account-preferences",
        consentAt: preferences.marketingEmails ? now : undefined,
        subscribedAt: preferences.marketingEmails ? now : undefined,
        status: preferences.marketingEmails ? "SUBSCRIBED" : "UNSUBSCRIBED",
        unsubscribedAt: preferences.marketingEmails ? null : now,
        suppressionReason: preferences.marketingEmails ? null : "CUSTOMER_UNSUBSCRIBED",
      },
    });
    integrations = preferences.marketingEmails
      ? await syncMarketingSubscriber(previous.email)
      : await syncMarketingUnsubscriber(previous.email);
    await prisma.newsletterSubscriber.update({
      where: { email: previous.email },
      data: {
        lastSyncAt: now,
        lastSyncStatus: integrations.some((integration) => integration.status === "FAILED") ? "PARTIAL_FAILURE" : "SYNCED",
      },
    });
  }

  return NextResponse.json({ preferences, integrations });
}
