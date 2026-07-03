import { NextResponse } from "next/server";
import { z } from "zod";
import { recordAdminActivity } from "@/lib/admin-activity";
import { requireAdminApiPermission } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import { createProviderRefund } from "@/lib/refund-provider";
import { sendRefundNotificationEmail } from "@/lib/refund-email";
import { refundGiftCardsForOrderTx } from "@/lib/gift-cards";

const schema = z.object({
  amount: z.coerce.number().positive().optional(),
  confirmManual: z.boolean().default(false),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApiPermission("orders:write");
  if ("response" in auth) return auth.response;
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ message: "Enter a valid refund amount." }, { status: 400 });
  const { id } = await params;
  const returnRequest = await prisma.returnRequest.findUnique({
    where: { id },
    include: {
      inspection: true,
      refund: true,
      items: { include: { orderItem: true } },
      order: { include: { payment: true, refunds: true } },
    },
  });
  if (!returnRequest) return NextResponse.json({ message: "Return request not found." }, { status: 404 });
  if (!["RETURN", "REFUND"].includes(returnRequest.resolution)) return NextResponse.json({ message: "Exchange requests cannot issue a refund." }, { status: 409 });

  if (returnRequest.refund) {
    if (!parsed.data.confirmManual || returnRequest.refund.status !== "MANUAL_REQUIRED") {
      return NextResponse.json({ message: "A refund already exists for this request.", refund: returnRequest.refund }, { status: 409 });
    }
    const completed = await prisma.$transaction(async (tx) => {
      const refund = await tx.refundRecord.update({ where: { id: returnRequest.refund!.id }, data: { status: "COMPLETED", note: "Manual payout confirmed by admin" } });
      const completedTotal = await tx.refundRecord.aggregate({ where: { orderId: returnRequest.orderId, status: "COMPLETED" }, _sum: { amount: true } });
      const totalRefunded = Number(completedTotal._sum.amount ?? 0);
      await tx.order.update({
        where: { id: returnRequest.orderId },
        data: { refundAmount: totalRefunded, paymentStatus: totalRefunded >= Number(returnRequest.order.total) ? "refunded" : "partially_refunded" },
      });
      await tx.returnRequest.update({
        where: { id: returnRequest.id },
        data: { status: "COMPLETED", completedAt: new Date(), events: { create: { status: "COMPLETED", message: "Manual refund confirmed", actor: auth.access.name } } },
      });
      return { refund, totalRefunded };
    });
    await sendRefundNotificationEmail({ recipient: returnRequest.order.email, orderId: returnRequest.orderId, orderNumber: returnRequest.order.orderNumber, refundId: completed.refund.id, amount: Number(completed.refund.amount), totalRefunded: completed.totalRefunded, kind: completed.refund.kind, locale: returnRequest.order.locale });
    return NextResponse.json({ message: "Manual refund confirmed.", refund: completed.refund, requestStatus: "COMPLETED" });
  }

  if (returnRequest.status !== "INSPECTED" || !returnRequest.inspection) {
    return NextResponse.json({ message: "Complete warehouse inspection before issuing a refund." }, { status: 409 });
  }
  if (returnRequest.inspection.disposition === "RETURN_TO_CUSTOMER") {
    return NextResponse.json({ message: "This inspection disposition does not permit a refund." }, { status: 409 });
  }
  const itemValue = returnRequest.items.reduce((sum, item) => sum + Number(item.orderItem.unitPrice) * item.quantity, 0);
  const completedRefunds = returnRequest.order.refunds.filter((refund) => refund.status === "COMPLETED").reduce((sum, refund) => sum + Number(refund.amount), 0);
  const refundable = Math.max(0, Number(returnRequest.order.total) - completedRefunds);
  const amount = parsed.data.amount ?? Math.min(itemValue, refundable);
  if (amount <= 0 || amount > refundable || amount > itemValue) {
    return NextResponse.json({ message: "Refund amount exceeds the selected item value or remaining order balance." }, { status: 400 });
  }

  try {
    const providerResult = await createProviderRefund({
      paymentProvider: returnRequest.order.payment?.provider ?? "manual",
      paymentReference: returnRequest.order.payment?.providerRef,
      amount,
      returnRequestId: returnRequest.id,
      orderNumber: returnRequest.order.orderNumber,
    });
    const isComplete = providerResult.status === "COMPLETED";
    const result = await prisma.$transaction(async (tx) => {
      const refund = await tx.refundRecord.create({
        data: {
          orderId: returnRequest.orderId,
          returnRequestId: returnRequest.id,
          amount,
          kind: amount >= refundable ? "FULL" : "PARTIAL",
          status: providerResult.status,
          provider: providerResult.provider,
          providerRef: providerResult.providerRef,
          note: providerResult.note,
          actor: auth.access.name,
        },
      });
      let totalRefunded = completedRefunds;
      if (isComplete) {
        totalRefunded += amount;
        await tx.order.update({ where: { id: returnRequest.orderId }, data: { refundAmount: totalRefunded, paymentStatus: totalRefunded >= Number(returnRequest.order.total) ? "refunded" : "partially_refunded" } });
        const giftCardRefundAmount = Math.max(
          0,
          Math.min(itemValue - amount, Number(returnRequest.order.giftCardTotal ?? 0)),
        );
        if (giftCardRefundAmount > 0) {
          await refundGiftCardsForOrderTx(tx, {
            orderId: returnRequest.orderId,
            amount: giftCardRefundAmount,
            actor: auth.access.name,
            note: `Refund for return ${returnRequest.id}`,
          });
        }
      }
      const requestStatus = isComplete ? "COMPLETED" : "REFUND_PROCESSING";
      await tx.returnRequest.update({
        where: { id: returnRequest.id },
        data: {
          status: requestStatus,
          integrationStatus: providerResult.status,
          externalReference: providerResult.providerRef,
          completedAt: isComplete ? new Date() : null,
          events: { create: isComplete ? [
            { status: "REFUND_PROCESSING", message: "Refund submitted to payment provider", actor: auth.access.name },
            { status: "COMPLETED", message: providerResult.note, actor: auth.access.name },
          ] : { status: "REFUND_PROCESSING", message: providerResult.note, actor: auth.access.name } },
        },
      });
      return { refund, totalRefunded, requestStatus };
    });
    await recordAdminActivity({ action: `Started refund for ${returnRequest.order.orderNumber}`, entityType: "return_request", entityId: returnRequest.id, actor: auth.access.name, metadata: { amount, provider: providerResult.provider, status: providerResult.status, providerRef: providerResult.providerRef } });
    if (isComplete) await sendRefundNotificationEmail({ recipient: returnRequest.order.email, orderId: returnRequest.orderId, orderNumber: returnRequest.order.orderNumber, refundId: result.refund.id, amount, totalRefunded: result.totalRefunded, kind: result.refund.kind, locale: returnRequest.order.locale });
    return NextResponse.json({ message: providerResult.note, refund: result.refund, requestStatus: result.requestStatus });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Refund provider request failed." }, { status: 502 });
  }
}
