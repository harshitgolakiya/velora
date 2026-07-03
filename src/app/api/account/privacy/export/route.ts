import { NextResponse } from "next/server";
import { requireCustomerSession } from "@/lib/account-data";
import { prisma } from "@/lib/prisma";
import { appendPrivacyAuditLog, privacyRetentionDate } from "@/lib/privacy-requests";

export async function GET() {
  const session = await requireCustomerSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const email = session.user.email;
  if (!email) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const [user, newsletter, deliveries] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        emailVerifiedAt: true,
        name: true,
        role: true,
        marketingEmails: true,
        productAlertEmails: true,
        postPurchaseEmails: true,
        preferredSize: true,
        fitPreference: true,
        compressionPreference: true,
        customerNotes: true,
        customerTags: true,
        createdAt: true,
        updatedAt: true,
        addresses: true,
        wishlist: {
          include: { items: { include: { product: { select: { title: true, slug: true } } } } },
        },
        orders: {
          include: { items: true, payment: true, shipment: true, shippingAddress: true, billingAddress: true },
          orderBy: { createdAt: "desc" },
        },
        reviews: { include: { product: { select: { title: true, slug: true } } } },
        productAlerts: { include: { product: { select: { title: true, slug: true } } } },
        carts: { include: { items: true }, orderBy: { createdAt: "desc" } },
        accountTokens: { select: { type: true, expiresAt: true, usedAt: true, createdAt: true } },
      },
    }),
    prisma.newsletterSubscriber.findUnique({ where: { email } }),
    prisma.emailDelivery.findMany({
      where: { recipient: email },
      select: { subject: true, provider: true, status: true, sentAt: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (!user) return NextResponse.json({ message: "Account not found" }, { status: 404 });
  const now = new Date();
  await prisma.privacyRequest.create({
    data: {
      userId: user.id,
      email: user.email,
      type: "EXPORT",
      status: "COMPLETED",
      requestedBy: "customer",
      retentionUntil: privacyRetentionDate(now),
      completedAt: now,
      auditLog: appendPrivacyAuditLog(null, {
        at: now,
        actor: user.email,
        action: "EXPORT_COMPLETED",
        message: "Customer downloaded account data export.",
      }),
    },
  });
  const payload = JSON.stringify({
    generatedAt: now.toISOString(),
    retentionNotice: "Completed order, payment, invoice, tax, delivery, and fraud-prevention records may be retained where legally required.",
    account: user,
    newsletter,
    emailDeliveryHistory: deliveries,
  }, null, 2);

  return new NextResponse(payload, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="account-data-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
