import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireCustomerSession } from "@/lib/account-data";
import { checkAuthRateLimit } from "@/lib/auth-rate-limit";
import { syncMarketingUnsubscriber } from "@/lib/marketing-sync";
import { prisma } from "@/lib/prisma";
import { appendPrivacyAuditLog, privacyRetentionDate } from "@/lib/privacy-requests";

const schema = z.object({
  password: z.string().min(1).max(128),
  confirmation: z.literal("DELETE"),
});

export async function POST(request: Request) {
  const session = await requireCustomerSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (!checkAuthRateLimit(`delete-account:${session.user.id}`, { limit: 3, windowMs: 60 * 60 * 1000 }).allowed) {
    return NextResponse.json({ message: "Too many deletion attempts. Try again later." }, { status: 429 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Enter your password and type DELETE." }, { status: 400 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, passwordHash: true, role: true, deletedAt: true },
  });
  if (!user || user.role !== "CUSTOMER" || user.deletedAt || !user.passwordHash) {
    return NextResponse.json({ message: "This account cannot be deleted here." }, { status: 400 });
  }
  if (!(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    return NextResponse.json({ message: "The password is incorrect." }, { status: 400 });
  }

  const heldRequest = await prisma.privacyRequest.findFirst({
    where: {
      OR: [{ userId: user.id }, { email: user.email }],
      type: "DELETE",
      legalHold: true,
      status: { in: ["PENDING", "ON_HOLD"] },
    },
    select: { id: true },
  });
  if (heldRequest) {
    return NextResponse.json(
      { message: "This deletion request is currently under legal hold. Contact support for help." },
      { status: 423 },
    );
  }

  const now = new Date();
  const privacyRequest = await prisma.privacyRequest.create({
    data: {
      userId: user.id,
      email: user.email,
      type: "DELETE",
      status: "PENDING",
      requestedBy: "customer",
      retentionUntil: privacyRetentionDate(now),
      auditLog: appendPrivacyAuditLog(null, {
        at: now,
        actor: user.email,
        action: "DELETE_REQUESTED",
        message: "Customer confirmed account deletion.",
      }),
    },
  });
  const deletedEmail = `deleted-${user.id}@deleted.invalid`;
  const retainedOrderCount = await prisma.order.count({ where: { userId: user.id } });
  await prisma.$transaction(async (transaction) => {
    const processingAuditLog = appendPrivacyAuditLog(privacyRequest.auditLog, {
      actor: "system",
      action: "DELETE_PROCESSING",
      message: "Deletion workflow started.",
    });
    await transaction.privacyRequest.update({
      where: { id: privacyRequest.id },
      data: {
        status: "PROCESSING",
        auditLog: processingAuditLog,
      },
    });
    await transaction.order.updateMany({ where: { userId: user.id }, data: { userId: null } });
    await transaction.cart.updateMany({ where: { userId: user.id }, data: { userId: null, email: null } });
    await transaction.address.updateMany({ where: { userId: user.id }, data: { userId: null } });
    await transaction.review.updateMany({ where: { userId: user.id }, data: { userId: null } });
    await transaction.productAlertSubscription.deleteMany({ where: { userId: user.id } });
    await transaction.accountToken.deleteMany({ where: { userId: user.id } });
    await transaction.wishlist.deleteMany({ where: { userId: user.id } });
    await transaction.newsletterSubscriber.upsert({
      where: { email: user.email },
      create: { email: user.email, source: "account-deletion", status: "UNSUBSCRIBED" },
      update: { source: "account-deletion", status: "UNSUBSCRIBED" },
    });
    await transaction.user.update({
      where: { id: user.id },
      data: {
        email: deletedEmail,
        emailVerifiedAt: null,
        name: "Deleted customer",
        passwordHash: null,
        marketingEmails: false,
        productAlertEmails: false,
        postPurchaseEmails: false,
        preferredSize: null,
        fitPreference: null,
        compressionPreference: null,
        customerNotes: null,
        customerTags: "[]",
        adminRoleId: null,
        deletedAt: new Date(),
      },
    });
    await transaction.privacyRequest.update({
      where: { id: privacyRequest.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        auditLog: appendPrivacyAuditLog(processingAuditLog, {
          actor: "system",
          action: "DELETE_COMPLETED",
          message: "Customer account anonymized and related customer-owned records removed or detached.",
        }),
      },
    });
  });

  const integrations = await syncMarketingUnsubscriber(user.email);
  return NextResponse.json({ deleted: true, privacyRequestId: privacyRequest.id, retainedOrderCount, integrations });
}
