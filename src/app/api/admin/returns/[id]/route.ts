import { NextResponse } from "next/server";
import { z } from "zod";
import { recordAdminActivity } from "@/lib/admin-activity";
import { requireAdminApiPermission } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import { canTransitionReturnRequest, returnRequestStatuses } from "@/lib/return-request-lifecycle";
import { sendReturnLifecycleNotification } from "@/lib/return-notifications";

const schema = z.object({
  status: z.enum(returnRequestStatuses),
  adminNote: z.string().trim().max(2000).optional(),
  externalReference: z.string().trim().max(200).optional(),
  pickupStart: z.coerce.date().optional(),
  pickupEnd: z.coerce.date().optional(),
  carrier: z.string().trim().min(2).max(80).optional(),
  trackingNo: z.string().trim().min(3).max(120).optional(),
  inspectionCondition: z.enum(["UNOPENED", "GOOD", "DAMAGED", "UNSELLABLE"]).optional(),
  disposition: z.enum(["RESTOCK", "REFURBISH", "QUARANTINE", "DISPOSE", "RETURN_TO_CUSTOMER"]).optional(),
  inspectionNotes: z.string().trim().max(2000).optional(),
}).superRefine((value, context) => {
  if (["AWAITING_CUSTOMER", "REJECTED", "CANCELLED"].includes(value.status) && !value.adminNote) {
    context.addIssue({ code: "custom", path: ["adminNote"], message: "A reason is required" });
  }
  if (value.status === "PICKUP_SCHEDULED") {
    if (!value.pickupStart) context.addIssue({ code: "custom", path: ["pickupStart"], message: "Pickup start is required" });
    if (!value.pickupEnd) context.addIssue({ code: "custom", path: ["pickupEnd"], message: "Pickup end is required" });
    if (value.pickupStart && value.pickupEnd && value.pickupEnd <= value.pickupStart) {
      context.addIssue({ code: "custom", path: ["pickupEnd"], message: "Pickup end must be after pickup start" });
    }
  }
  if (value.status === "INSPECTED") {
    if (!value.inspectionCondition) context.addIssue({ code: "custom", path: ["inspectionCondition"], message: "Condition is required" });
    if (!value.disposition) context.addIssue({ code: "custom", path: ["disposition"], message: "Disposition is required" });
  }
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApiPermission("orders:write");
  if ("response" in auth) return auth.response;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ message: "Check the return update", errors: parsed.error.flatten() }, { status: 400 });
  }

  const { id } = await params;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const current = await tx.returnRequest.findUnique({
        where: { id },
        include: {
          order: true,
          replacementOrder: { select: { id: true, orderNumber: true } },
          returnShipment: true,
          inspection: true,
          items: { include: { requestedVariant: { include: { color: true, size: true } }, orderItem: true } },
        },
      });
      if (!current) throw new Error("NOT_FOUND");
      if (current.status !== parsed.data.status && !canTransitionReturnRequest(current.status, parsed.data.status, current.resolution)) {
        throw new Error("INVALID_TRANSITION");
      }
      if (parsed.data.status === "REPLACEMENT_CREATED" && current.resolution !== "EXCHANGE") {
        throw new Error("INVALID_REPLACEMENT");
      }

      let replacementOrder = current.replacementOrder;
      let returnShipment = current.returnShipment;

      if (current.status === "PENDING" && parsed.data.status === "APPROVED" && current.resolution === "EXCHANGE") {
        for (const item of current.items) {
          if (!item.requestedVariantId || !item.requestedVariant) continue;
          const available = item.requestedVariant.stock - item.requestedVariant.reservedStock;
          if (!item.requestedVariant.allowBackorder && available < item.quantity) {
            throw new Error("INSUFFICIENT_REPLACEMENT_STOCK");
          }
          await tx.productVariant.update({
            where: { id: item.requestedVariantId },
            data: { reservedStock: { increment: item.quantity } },
          });
        }
      }

      if (["REJECTED", "CANCELLED"].includes(parsed.data.status) && !["PENDING", "REJECTED", "CANCELLED"].includes(current.status)) {
        for (const item of current.items) {
          if (!item.requestedVariantId) continue;
          await tx.productVariant.update({
            where: { id: item.requestedVariantId },
            data: { reservedStock: Math.max(0, (item.requestedVariant?.reservedStock ?? 0) - item.quantity) },
          });
        }
      }

      if (current.status !== "REPLACEMENT_CREATED" && parsed.data.status === "REPLACEMENT_CREATED") {
        if (current.replacementOrderId) throw new Error("REPLACEMENT_EXISTS");
        if (current.items.some((item) => !item.requestedVariantId || !item.requestedVariant)) {
          throw new Error("MISSING_REPLACEMENT_VARIANT");
        }

        for (const item of current.items) {
          const variant = item.requestedVariant!;
          if (!variant.allowBackorder && (variant.stock < item.quantity || variant.reservedStock < item.quantity)) {
            throw new Error("INSUFFICIENT_REPLACEMENT_STOCK");
          }
          await tx.productVariant.update({
            where: { id: variant.id },
            data: {
              stock: { decrement: item.quantity },
              reservedStock: { decrement: item.quantity },
              inventoryLogs: {
                create: {
                  oldStock: variant.stock,
                  newStock: variant.stock - item.quantity,
                  delta: -item.quantity,
                  reason: "EXCHANGE_REPLACEMENT",
                  note: `Exchange for ${current.order.orderNumber}`,
                  actor: auth.access.name,
                },
              },
            },
          });
        }

        const replacementOrderNumber = `EX-${current.order.orderNumber}-${current.id.slice(-6).toUpperCase()}`;
        replacementOrder = await tx.order.create({
          data: {
            orderNumber: replacementOrderNumber,
            userId: current.order.userId,
            email: current.order.email,
            locale: current.order.locale,
            status: "PROCESSING",
            paymentStatus: "exchange_no_charge",
            fulfillmentStatus: "unfulfilled",
            internalNote: `Replacement order for ${current.order.orderNumber} / return ${current.id}`,
            customerNote: current.adminNote,
            orderTags: "exchange_replacement",
            subtotal: 0,
            shippingTotal: 0,
            discountTotal: 0,
            total: 0,
            shippingAddressId: current.order.shippingAddressId,
            billingAddressId: current.order.billingAddressId,
            items: {
              create: current.items.map((item) => ({
                productId: item.requestedVariant!.productId,
                variantId: item.requestedVariantId!,
                title: item.orderItem.title,
                size: item.requestedVariant!.size.name,
                color: item.requestedVariant!.color.name,
                quantity: item.quantity,
                unitPrice: 0,
              })),
            },
            payment: { create: { provider: "exchange", status: "paid", amount: 0 } },
            shipment: { create: { status: "pending" } },
          },
          select: { id: true, orderNumber: true },
        });
      }

      if (current.status !== "PICKUP_SCHEDULED" && parsed.data.status === "PICKUP_SCHEDULED") {
        returnShipment = await tx.returnShipment.upsert({
          where: { requestId: current.id },
          create: {
            requestId: current.id,
            status: "pickup_scheduled",
            pickupStart: parsed.data.pickupStart!,
            pickupEnd: parsed.data.pickupEnd!,
            carrier: parsed.data.carrier || "Velora Returns",
            trackingNo: parsed.data.trackingNo,
          },
          update: {
            status: "pickup_scheduled",
            pickupStart: parsed.data.pickupStart!,
            pickupEnd: parsed.data.pickupEnd!,
            carrier: parsed.data.carrier || current.returnShipment?.carrier || "Velora Returns",
            trackingNo: parsed.data.trackingNo || current.returnShipment?.trackingNo,
          },
        });
      } else if (["PICKED_UP", "RECEIVED"].includes(parsed.data.status) && current.returnShipment) {
        returnShipment = await tx.returnShipment.update({
          where: { requestId: current.id },
          data: { status: parsed.data.status.toLowerCase() },
        });
      }

      if (current.status !== "INSPECTED" && parsed.data.status === "INSPECTED") {
        await tx.returnInspection.upsert({
          where: { requestId: current.id },
          create: {
            requestId: current.id,
            condition: parsed.data.inspectionCondition!,
            disposition: parsed.data.disposition!,
            notes: parsed.data.inspectionNotes,
            inspectedBy: auth.access.name,
          },
          update: {
            condition: parsed.data.inspectionCondition!,
            disposition: parsed.data.disposition!,
            notes: parsed.data.inspectionNotes,
            inspectedBy: auth.access.name,
            inspectedAt: new Date(),
          },
        });
      }

      const now = new Date();
      const updated = await tx.returnRequest.update({
        where: { id },
        data: {
          status: parsed.data.status,
          adminNote: parsed.data.adminNote || current.adminNote,
          externalReference: parsed.data.externalReference || current.externalReference,
          replacementOrderId: replacementOrder?.id ?? current.replacementOrderId,
          decisionAt: ["APPROVED", "REJECTED"].includes(parsed.data.status) ? now : current.decisionAt,
          completedAt: parsed.data.status === "COMPLETED" ? now : current.completedAt,
          events: current.status === parsed.data.status ? undefined : {
            create: {
              status: parsed.data.status,
              message: parsed.data.adminNote || `Request moved to ${parsed.data.status.toLowerCase().replaceAll("_", " ")}`,
              actor: auth.access.name,
            },
          },
        },
        include: {
          events: { orderBy: { createdAt: "asc" } },
          replacementOrder: { include: { shipment: true } },
          returnShipment: true,
          inspection: true,
          order: { select: { id: true, orderNumber: true, email: true, locale: true } },
        },
      });

      await recordAdminActivity({
        action: `Updated ${current.resolution.toLowerCase()} request to ${parsed.data.status.toLowerCase().replaceAll("_", " ")}`,
        entityType: "return_request",
        entityId: current.id,
        actor: auth.access.name,
        metadata: {
          orderNumber: current.order.orderNumber,
          previousStatus: current.status,
          status: parsed.data.status,
          replacementOrderNumber: replacementOrder?.orderNumber,
          returnTrackingNo: returnShipment?.trackingNo,
        },
      }, tx);

      return Object.assign(updated, { statusChanged: current.status !== parsed.data.status });
    });

    if (result.statusChanged) {
      const event = result.events.at(-1);
      if (event) {
        await sendReturnLifecycleNotification({
          requestId: result.id,
          eventId: event.id,
          orderId: result.order.id,
          orderNumber: result.order.orderNumber,
          recipient: result.order.email,
          status: result.status,
          message: event.message,
          locale: result.order.locale,
        });
      }
    }

    return NextResponse.json({
      request: {
        id: result.id,
        status: result.status,
        adminNote: result.adminNote,
        externalReference: result.externalReference,
        replacementOrder: result.replacementOrder ? {
          id: result.replacementOrder.id,
          orderNumber: result.replacementOrder.orderNumber,
          status: result.replacementOrder.status,
          fulfillmentStatus: result.replacementOrder.fulfillmentStatus,
          shipmentStatus: result.replacementOrder.shipment?.status,
          trackingNo: result.replacementOrder.shipment?.trackingNo,
        } : undefined,
        returnShipment: result.returnShipment ? {
          status: result.returnShipment.status,
          carrier: result.returnShipment.carrier,
          trackingNo: result.returnShipment.trackingNo,
          pickupStart: result.returnShipment.pickupStart?.toISOString(),
          pickupEnd: result.returnShipment.pickupEnd?.toISOString(),
          labelId: result.returnShipment.labelId,
        } : undefined,
        inspection: result.inspection ? {
          condition: result.inspection.condition,
          disposition: result.inspection.disposition,
          notes: result.inspection.notes,
          inspectedBy: result.inspection.inspectedBy,
          inspectedAt: result.inspection.inspectedAt.toISOString(),
        } : undefined,
        decisionAt: result.decisionAt?.toISOString(),
        completedAt: result.completedAt?.toISOString(),
        updatedAt: result.updatedAt.toISOString(),
        events: result.events.map((event) => ({ ...event, createdAt: event.createdAt.toISOString() })),
      },
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNKNOWN";
    if (code === "NOT_FOUND") return NextResponse.json({ message: "Return request not found." }, { status: 404 });
    if (code === "INVALID_TRANSITION") return NextResponse.json({ message: "That lifecycle transition is not allowed." }, { status: 409 });
    if (code === "INVALID_REPLACEMENT") return NextResponse.json({ message: "Only exchanges can create replacement orders." }, { status: 409 });
    if (code === "REPLACEMENT_EXISTS") return NextResponse.json({ message: "A replacement order already exists." }, { status: 409 });
    if (code === "MISSING_REPLACEMENT_VARIANT") return NextResponse.json({ message: "Every exchange item must have a replacement variant." }, { status: 409 });
    if (code === "INSUFFICIENT_REPLACEMENT_STOCK") return NextResponse.json({ message: "Replacement stock is no longer available." }, { status: 409 });
    return NextResponse.json({ message: "Unable to update the return request." }, { status: 500 });
  }
}
