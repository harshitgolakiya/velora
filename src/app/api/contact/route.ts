import { randomInt } from "node:crypto";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { checkAuthRateLimit } from "@/lib/auth-rate-limit";
import { deliverEmail } from "@/lib/email-delivery";
import { prisma } from "@/lib/prisma";
import { contactRequestSchema, isContactSubmissionTooFast } from "@/lib/contact-support";
import { escapeEmailHtml, localeFromRequest, normalizeEmailLocale, transactionalEmailShell } from "@/lib/transactional-email";

async function createCaseNumber() {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const value = `CS-${new Date().getFullYear()}-${randomInt(100000, 999999)}`;
    if (!await prisma.supportCase.findUnique({ where: { caseNumber: value }, select: { id: true } })) return value;
  }
  return `CS-${Date.now()}`;
}

export async function POST(request: Request) {
  const locale = localeFromRequest(request);
  const isArabic = normalizeEmailLocale(locale) === "ar";
  const parsed = contactRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Check the highlighted contact details.", errors: parsed.error.flatten() }, { status: 400 });
  const data = parsed.data;
  if (isContactSubmissionTooFast(data.startedAt)) return NextResponse.json({ message: "Please review your message before sending." }, { status: 400 });
  const clientKey = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? data.email;
  if (!checkAuthRateLimit(`contact:${clientKey}`, { limit: 5, windowMs: 60 * 60_000 }).allowed) {
    return NextResponse.json({ message: "Too many contact requests. Try again later." }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  const order = data.orderNumber ? await prisma.order.findFirst({
    where: {
      orderNumber: data.orderNumber,
      OR: [
        ...(session?.user?.id ? [{ userId: session.user.id }] : []),
        { email: data.email },
      ],
    },
    select: { id: true, orderNumber: true },
  }) : null;
  if (data.orderNumber && !order) return NextResponse.json({ message: "That order does not match this account or email." }, { status: 403 });

  const supportCase = await prisma.supportCase.create({
    data: {
      caseNumber: await createCaseNumber(),
      userId: session?.user?.email === data.email ? session.user.id : undefined,
      orderId: order?.id,
      name: data.name,
      email: data.email,
      locale,
      category: data.category,
      subject: data.subject,
      message: data.message,
      priority: ["PAYMENT", "DELIVERY"].includes(data.category) ? "HIGH" : "NORMAL",
      source: order ? "order_support" : "contact_page",
    },
  });

  const safeName = escapeEmailHtml(data.name);
  const safeSubject = escapeEmailHtml(data.subject);
  const safeMessage = escapeEmailHtml(data.message).replace(/\n/g, "<br>");
  await Promise.all([
    deliverEmail({
      recipient: data.email,
      subject: isArabic ? `استلمنا طلبك ${supportCase.caseNumber}` : `We received your request ${supportCase.caseNumber}`,
      html: transactionalEmailShell({
        locale,
        heading: isArabic ? "تم استلام الطلب" : "Request received",
        body: isArabic
          ? `مرحبا ${safeName}،<br>رقم المرجع الخاص بك هو <strong>${supportCase.caseNumber}</strong>. سيرد فريق الدعم على البريد المستخدم في هذا الطلب.<br><strong>${safeSubject}</strong>`
          : `Hello ${safeName},<br>Your reference is <strong>${supportCase.caseNumber}</strong>. Our support team will reply to the email used in this request.<br><strong>${safeSubject}</strong>`,
      }),
      sourceKey: `support-case-customer:${supportCase.id}`,
      metadata: { supportCaseId: supportCase.id, type: "SUPPORT_CONFIRMATION", locale },
    }),
    deliverEmail({
      recipient: process.env.SUPPORT_EMAIL ?? process.env.SMTP_USER ?? "support@velora.ae",
      subject: `[${supportCase.priority}] ${supportCase.caseNumber} · ${data.subject}`,
      html: `<div style="font-family:Arial,sans-serif;padding:32px"><h1>${safeSubject}</h1><p>${safeName} · ${escapeEmailHtml(data.email)}</p><p>Category: ${data.category}${order ? ` · Order ${order.orderNumber}` : ""}</p><p>${safeMessage}</p></div>`,
      sourceKey: `support-case-admin:${supportCase.id}`,
      metadata: { supportCaseId: supportCase.id, type: "SUPPORT_ADMIN_ALERT" },
    }),
  ]);

  return NextResponse.json({ caseNumber: supportCase.caseNumber, message: "Your request has been sent." }, { status: 201 });
}
