import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { canTransitionReturnRequest } from "@/lib/return-request-lifecycle";
import { mapCarrierWebhookStatus, verifyReturnCarrierSignature } from "@/lib/return-carrier-webhook";
import { sendReturnLifecycleNotification } from "@/lib/return-notifications";

const schema = z.object({
  eventId: z.string().trim().min(3).max(200),
  status: z.string().trim().min(2).max(100),
  requestId: z.string().trim().optional(),
  reference: z.string().trim().optional(),
  trackingNo: z.string().trim().optional(),
  carrier: z.string().trim().max(80).optional(),
  message: z.string().trim().max(500).optional(),
});

export async function POST(request: Request) {
  const rawBody = await request.text();
  const secret = process.env.RETURN_CARRIER_WEBHOOK_SECRET ?? "";
  if (!verifyReturnCarrierSignature(rawBody, request.headers.get("x-return-signature"), secret)) {
    return NextResponse.json({ message: "Invalid webhook signature." }, { status: 401 });
  }
  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ message: "Invalid carrier event." }, { status: 400 });
  }
  const parsed = schema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ message: "Invalid carrier event." }, { status: 400 });
  const targetStatus = mapCarrierWebhookStatus(parsed.data.status);
  if (!targetStatus) return NextResponse.json({ message: "Unsupported carrier status." }, { status: 202 });

  const existing = await prisma.returnIntegrationAttempt.findFirst({ where: { providerEventId: parsed.data.eventId }, select: { id: true } });
  if (existing) return NextResponse.json({ received: true, duplicate: true });
  const returnRequest = await prisma.returnRequest.findFirst({
    where: {
      OR: [
        ...(parsed.data.requestId ? [{ id: parsed.data.requestId }] : []),
        ...(parsed.data.reference ? [{ externalReference: parsed.data.reference }] : []),
        ...(parsed.data.trackingNo ? [{ returnShipment: { is: { trackingNo: parsed.data.trackingNo } } }] : []),
      ],
    },
    include: {
      order: { select: { id: true, orderNumber: true, email: true, locale: true } },
      returnShipment: true,
      items: { include: { requestedVariant: true } },
    },
  });
  if (!returnRequest) return NextResponse.json({ message: "Return request not found." }, { status: 404 });
  const statusChanged = returnRequest.status !== targetStatus;
  const transitionAllowed = !statusChanged || canTransitionReturnRequest(returnRequest.status, targetStatus, returnRequest.resolution);

  const result = await prisma.$transaction(async (tx) => {
    const duplicate = await tx.returnIntegrationAttempt.findFirst({ where: { providerEventId: parsed.data.eventId }, select: { id: true } });
    if (duplicate) return { duplicate: true as const };
    const attempt = await tx.returnIntegrationAttempt.create({
      data: {
        requestId: returnRequest.id,
        provider: parsed.data.carrier ?? returnRequest.returnShipment?.carrier ?? "carrier_webhook",
        action: `WEBHOOK_${parsed.data.status.toUpperCase()}`,
        status: transitionAllowed ? "SUCCEEDED" : "IGNORED",
        attempts: 1,
        providerEventId: parsed.data.eventId,
        externalRef: parsed.data.reference,
        requestPayload: rawBody,
        responsePayload: JSON.stringify({ targetStatus, transitionAllowed }),
        errorMessage: transitionAllowed ? null : `Invalid transition from ${returnRequest.status} to ${targetStatus}`,
        lastAttemptAt: new Date(),
      },
    });
    if (!transitionAllowed) return { duplicate: false as const, attempt, event: null };
    if (targetStatus === "CANCELLED" && returnRequest.resolution === "EXCHANGE") {
      for (const item of returnRequest.items) {
        if (!item.requestedVariantId || !item.requestedVariant) continue;
        await tx.productVariant.update({ where: { id: item.requestedVariantId }, data: { reservedStock: Math.max(0, item.requestedVariant.reservedStock - item.quantity) } });
      }
    }
    if (returnRequest.returnShipment) {
      await tx.returnShipment.update({
        where: { requestId: returnRequest.id },
        data: { status: parsed.data.status.toLowerCase(), carrier: parsed.data.carrier ?? undefined, trackingNo: parsed.data.trackingNo ?? undefined },
      });
    }
    const updated = await tx.returnRequest.update({
      where: { id: returnRequest.id },
      data: {
        status: targetStatus,
        integrationStatus: "SUCCEEDED",
        externalReference: parsed.data.reference ?? returnRequest.externalReference,
        events: statusChanged ? { create: { status: targetStatus, message: parsed.data.message ?? `Carrier reported ${parsed.data.status}`, actor: parsed.data.carrier ?? "Carrier webhook" } } : undefined,
      },
      include: { events: { orderBy: { createdAt: "desc" }, take: 1 } },
    });
    return { duplicate: false as const, attempt, event: statusChanged ? updated.events[0] : null };
  });
  if (result.duplicate) return NextResponse.json({ received: true, duplicate: true });
  if (!transitionAllowed) return NextResponse.json({ received: true, ignored: true, reason: result.attempt.errorMessage }, { status: 202 });
  if (result.event) {
    await sendReturnLifecycleNotification({ requestId: returnRequest.id, eventId: result.event.id, orderId: returnRequest.order.id, orderNumber: returnRequest.order.orderNumber, recipient: returnRequest.order.email, status: targetStatus, message: result.event.message, locale: returnRequest.order.locale });
  }
  return NextResponse.json({ received: true, status: targetStatus });
}
