import { NextResponse } from "next/server";
import { z } from "zod";
import { recordAdminActivity } from "@/lib/admin-activity";
import { requireAdminApiPermission } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import { syncReturnCarrier } from "@/lib/return-carrier";

const schema = z.object({
  action: z.enum(["SCHEDULE_PICKUP", "CANCEL_PICKUP", "REFRESH_STATUS"]),
  attemptId: z.string().optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApiPermission("orders:write");
  if ("response" in auth) return auth.response;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Choose a valid carrier action." }, { status: 400 });
  const { id } = await params;
  const returnRequest = await prisma.returnRequest.findUnique({
    where: { id },
    include: { returnShipment: true, order: { include: { shippingAddress: true } } },
  });
  if (!returnRequest) return NextResponse.json({ message: "Return request not found." }, { status: 404 });
  if (!returnRequest.returnShipment) return NextResponse.json({ message: "Schedule the return shipment first." }, { status: 409 });
  if (parsed.data.attemptId) {
    const previous = await prisma.returnIntegrationAttempt.findFirst({ where: { id: parsed.data.attemptId, requestId: id } });
    if (!previous || previous.status !== "FAILED") return NextResponse.json({ message: "Only failed attempts can be retried." }, { status: 409 });
  }

  const address = returnRequest.order.shippingAddress;
  const payload = {
    action: parsed.data.action,
    requestId: returnRequest.id,
    orderNumber: returnRequest.order.orderNumber,
    carrier: returnRequest.returnShipment.carrier,
    trackingNo: returnRequest.returnShipment.trackingNo,
    pickupStart: returnRequest.returnShipment.pickupStart,
    pickupEnd: returnRequest.returnShipment.pickupEnd,
    customerName: address?.name,
    phone: address?.phone,
    address: address ? [address.line1, address.line2, address.city, address.country].filter(Boolean).join(", ") : undefined,
  };
  const attempt = parsed.data.attemptId
    ? await prisma.returnIntegrationAttempt.update({ where: { id: parsed.data.attemptId }, data: { status: "PENDING", errorMessage: null, nextRetryAt: null } })
    : await prisma.returnIntegrationAttempt.create({ data: { requestId: id, provider: returnRequest.returnShipment.carrier ?? "manual", action: parsed.data.action, requestPayload: JSON.stringify(payload) } });

  try {
    const result = await syncReturnCarrier(payload);
    const updated = await prisma.$transaction(async (tx) => {
      const integration = await tx.returnIntegrationAttempt.update({
        where: { id: attempt.id },
        data: {
          provider: result.provider,
          status: result.status,
          attempts: { increment: 1 },
          responsePayload: JSON.stringify(result),
          externalRef: "externalRef" in result ? result.externalRef : undefined,
          lastAttemptAt: new Date(),
        },
      });
      await tx.returnRequest.update({ where: { id }, data: { integrationStatus: result.status, externalReference: "externalRef" in result ? result.externalRef : returnRequest.externalReference } });
      if ("trackingNo" in result && result.trackingNo) await tx.returnShipment.update({ where: { requestId: id }, data: { trackingNo: result.trackingNo, status: result.carrierStatus ?? undefined } });
      return integration;
    });
    await recordAdminActivity({ action: `${parsed.data.action.toLowerCase().replaceAll("_", " ")} for ${returnRequest.order.orderNumber}`, entityType: "return_request", entityId: id, actor: auth.access.name, metadata: { integrationStatus: result.status, attemptId: attempt.id } });
    return NextResponse.json({ message: result.message, attempt: updated });
  } catch (error) {
    const attempts = attempt.attempts + 1;
    const nextRetryAt = new Date(Date.now() + Math.min(60, 5 * 2 ** Math.max(0, attempts - 1)) * 60_000);
    const failed = await prisma.$transaction(async (tx) => {
      const integration = await tx.returnIntegrationAttempt.update({ where: { id: attempt.id }, data: { status: "FAILED", attempts, errorMessage: error instanceof Error ? error.message : "Carrier synchronization failed", lastAttemptAt: new Date(), nextRetryAt } });
      await tx.returnRequest.update({ where: { id }, data: { integrationStatus: "FAILED" } });
      return integration;
    });
    return NextResponse.json({ message: failed.errorMessage, attempt: failed }, { status: 502 });
  }
}
