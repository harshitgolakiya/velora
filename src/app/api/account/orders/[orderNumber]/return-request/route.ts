import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthorizedAccountOrder } from "@/lib/account-orders";
import { requireCustomerSession } from "@/lib/account-data";
import { prisma } from "@/lib/prisma";
import { evaluateReturnEligibility } from "@/lib/return-policy";
import { getReturnSettings } from "@/lib/store-settings";
import { sendReturnLifecycleNotification } from "@/lib/return-notifications";
import { localeFromRequest } from "@/lib/transactional-email";
import { requireSameOriginRequest } from "@/lib/request-security";

const allowedReasons = {
  return: ["Changed my mind", "Fit issue", "Quality not as expected", "Ordered by mistake", "Other"],
  exchange: ["Fit issue", "Wrong item received", "Damaged item", "Color not as expected", "Other"],
  refund: ["Damaged item", "Wrong item received", "Item missing", "Delivery issue", "Other"],
} as const;

const requestSchema = z.object({
  resolution: z.enum(["return", "exchange", "refund"]),
  reason: z.string().trim().min(3).max(120),
  notes: z.string().trim().max(1000).default(""),
  itemIds: z.array(z.string().trim().min(1)).min(1).max(50),
  itemQuantities: z.array(z.object({
    orderItemId: z.string().trim().min(1),
    quantity: z.number().int().min(1),
  })).max(50).default([]),
  exchangeSelections: z.array(z.object({
    orderItemId: z.string().trim().min(1),
    requestedVariantId: z.string().trim().min(1),
  })).max(50).default([]),
}).superRefine((value, context) => {
  if (!(allowedReasons[value.resolution] as readonly string[]).includes(value.reason)) {
    context.addIssue({ code: "custom", path: ["reason"], message: "Reason is not valid for this request type" });
  }
  if (value.resolution !== "exchange" && value.exchangeSelections.length) {
    context.addIssue({ code: "custom", path: ["exchangeSelections"], message: "Replacement variants are only valid for exchanges" });
  }
});

const replySchema = z.object({
  message: z.string().trim().min(3).max(1000),
});

function mergeTags(current: string | null | undefined, resolution: string) {
  const tags = new Set(
    (current ?? "")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
  );
  tags.add("return_requested");
  if (resolution === "refund") tags.add("refund_requested");
  if (resolution === "exchange") tags.add("exchange_requested");
  return Array.from(tags).join(", ");
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orderNumber: string }> },
) {
  const originError = requireSameOriginRequest(request);
  if (originError) return originError;

  const locale = localeFromRequest(request);
  const session = await requireCustomerSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;
  const email = session.user.email;
  if (!userId || !email) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Check the request details", errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { orderNumber } = await params;
  const order = await getAuthorizedAccountOrder({ orderNumber, userId, email });
  if (!order) return NextResponse.json({ message: "Not found" }, { status: 404 });

  const eligibility = evaluateReturnEligibility({
    settings: await getReturnSettings(),
    resolution: parsed.data.resolution,
    reason: parsed.data.reason,
    orderStatus: order.status,
    deliveredAt: order.shipment?.deliveredAt,
  });
  if (!eligibility.eligible) {
    return NextResponse.json({ message: eligibility.message }, { status: 409 });
  }

  const alreadyRequested = order.returnRequests.length > 0 || (order.orderTags ?? "")
    .split(",")
    .some((tag) => ["return_requested", "refund_requested", "exchange_requested"].includes(tag.trim()));
  if (alreadyRequested) {
    return NextResponse.json({ message: "A return or exchange request already exists for this order." }, { status: 409 });
  }

  const selectedIds = new Set(parsed.data.itemIds);
  const selectedOrderItems = order.items.filter((item) => selectedIds.has(item.id));
  if (selectedOrderItems.length !== selectedIds.size) {
    return NextResponse.json({ message: "One or more selected items do not belong to this order." }, { status: 400 });
  }

  const exchangeSelectionMap = new Map(
    parsed.data.exchangeSelections.map((selection) => [selection.orderItemId, selection.requestedVariantId]),
  );
  const itemQuantityMap = new Map(
    parsed.data.itemQuantities.map((selection) => [selection.orderItemId, selection.quantity]),
  );
  if (Array.from(exchangeSelectionMap.keys()).some((itemId) => !selectedIds.has(itemId))) {
    return NextResponse.json({ message: "A replacement was selected for an item outside this request." }, { status: 400 });
  }

  const requestItems: Array<{
    orderItemId: string;
    quantity: number;
    requestedVariantId?: string;
    requestedSize?: string;
  }> = [];
  const selectedItems: string[] = [];

  for (const item of selectedOrderItems) {
    const requestedQuantity = itemQuantityMap.get(item.id) ?? item.quantity;
    if (requestedQuantity < 1 || requestedQuantity > item.quantity) {
      return NextResponse.json({ message: `Choose a valid quantity for ${item.title}.` }, { status: 400 });
    }
    const requestedVariantId = exchangeSelectionMap.get(item.id);
    const requestedVariant = requestedVariantId
      ? item.product.variants.find((variant) => variant.id === requestedVariantId)
      : undefined;

    if (requestedVariantId && !requestedVariant) {
      return NextResponse.json({ message: `The replacement selected for ${item.title} is invalid.` }, { status: 400 });
    }
    if (requestedVariant) {
      const sameColor = requestedVariant.color.name.trim().toLowerCase() === item.color.trim().toLowerCase();
      const sameVariant = requestedVariant.id === item.variantId || requestedVariant.size.name === item.size;
      const available = requestedVariant.allowBackorder || requestedVariant.stock - requestedVariant.reservedStock >= requestedQuantity;
      if (!sameColor || sameVariant || !available) {
        return NextResponse.json({ message: `The requested size for ${item.title} is no longer available.` }, { status: 409 });
      }
    }

    requestItems.push({
      orderItemId: item.id,
      quantity: requestedQuantity,
      requestedVariantId: requestedVariant?.id,
      requestedSize: requestedVariant?.size.name,
    });
    selectedItems.push(
      `${item.title} (${item.color} / ${item.size}) x${requestedQuantity}${requestedVariant ? ` -> ${requestedVariant.size.name}` : ""}`,
    );
  }

  const submittedAt = new Intl.DateTimeFormat("en-AE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Dubai",
  }).format(new Date());
  const requestNote = [
    `[${submittedAt}] ${parsed.data.resolution.toUpperCase()} REQUEST`,
    `Reason: ${parsed.data.reason}`,
    `Items: ${selectedItems.length ? selectedItems.join("; ") : "Full order"}`,
    `Customer note: ${parsed.data.notes || "None"}`,
  ].join("\n");

  const updated = await prisma.$transaction(async (tx) => {
    const createdRequest = await tx.returnRequest.create({
      data: {
        orderId: order.id,
        resolution: parsed.data.resolution.toUpperCase(),
        reason: parsed.data.reason,
        notes: parsed.data.notes,
        items: { create: requestItems },
        events: {
          create: {
            status: "PENDING",
            message: "Request submitted for review",
            actor: email,
          },
        },
      },
    });
    const updatedOrder = await tx.order.update({
      where: { id: order.id },
      data: {
        orderTags: mergeTags(order.orderTags, parsed.data.resolution),
        customerNote: order.customerNote ? `${order.customerNote}\n\n${requestNote}` : requestNote,
      },
      select: { orderTags: true },
    });
    return { createdRequest, updatedOrder };
  });

  const submittedEvent = await prisma.returnRequestEvent.findFirst({ where: { requestId: updated.createdRequest.id }, orderBy: { createdAt: "desc" } });
  if (submittedEvent) {
    await sendReturnLifecycleNotification({ requestId: updated.createdRequest.id, eventId: submittedEvent.id, orderId: order.id, orderNumber: order.orderNumber, recipient: email, status: "PENDING", message: submittedEvent.message, locale });
  }

  return NextResponse.json({
    message: parsed.data.resolution === "exchange"
      ? "Exchange request submitted. We will confirm stock before arranging pickup and replacement delivery."
      : "Request submitted. Support will review it from your order record.",
    orderTags: updated.updatedOrder.orderTags,
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ orderNumber: string }> },
) {
  const originError = requireSameOriginRequest(request);
  if (originError) return originError;

  const locale = localeFromRequest(request);
  const session = await requireCustomerSession();
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const customerEmail = session.user.email;
  const parsed = replySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ message: "Enter a response for support." }, { status: 400 });
  }

  const { orderNumber } = await params;
  const order = await getAuthorizedAccountOrder({
    orderNumber,
    userId: session.user.id,
    email: customerEmail,
  });
  if (!order) return NextResponse.json({ message: "Not found" }, { status: 404 });
  const current = order.returnRequests[0];
  if (!current || current.status !== "AWAITING_CUSTOMER") {
    return NextResponse.json({ message: "This request is not waiting for customer information." }, { status: 409 });
  }

  const updated = await prisma.returnRequest.update({
    where: { id: current.id },
    data: {
      status: "PENDING",
      notes: current.notes ? `${current.notes}\n\nCustomer follow-up: ${parsed.data.message}` : parsed.data.message,
      events: {
        create: {
          status: "PENDING",
          message: parsed.data.message,
          actor: customerEmail,
        },
      },
    },
    include: { events: { orderBy: { createdAt: "asc" } } },
  });

  const replyEvent = updated.events.at(-1);
  if (replyEvent) {
    await sendReturnLifecycleNotification({ requestId: updated.id, eventId: replyEvent.id, orderId: order.id, orderNumber: order.orderNumber, recipient: customerEmail, status: updated.status, message: replyEvent.message, locale });
  }

  return NextResponse.json({
    message: "Your response was sent to support.",
    request: {
      status: updated.status,
      notes: updated.notes,
      updatedAt: updated.updatedAt.toISOString(),
      events: updated.events.map((event) => ({
        id: event.id,
        status: event.status,
        message: event.message,
        createdAt: event.createdAt.toISOString(),
      })),
    },
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ orderNumber: string }> },
) {
  const originError = requireSameOriginRequest(request);
  if (originError) return originError;

  const locale = localeFromRequest(request);
  const session = await requireCustomerSession();
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const customerEmail = session.user.email;

  const { orderNumber } = await params;
  const order = await getAuthorizedAccountOrder({
    orderNumber,
    userId: session.user.id,
    email: customerEmail,
  });
  if (!order) return NextResponse.json({ message: "Not found" }, { status: 404 });
  const requestId = order.returnRequests[0]?.id;
  if (!requestId) return NextResponse.json({ message: "Return request not found." }, { status: 404 });

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const current = await tx.returnRequest.findUnique({
        where: { id: requestId },
        include: { items: { include: { requestedVariant: true } } },
      });
      if (!current) throw new Error("NOT_FOUND");
      if (!["PENDING", "AWAITING_CUSTOMER", "APPROVED"].includes(current.status)) throw new Error("TOO_LATE");

      if (current.status === "APPROVED" && current.resolution === "EXCHANGE") {
        for (const item of current.items) {
          if (!item.requestedVariantId || !item.requestedVariant) continue;
          await tx.productVariant.update({
            where: { id: item.requestedVariantId },
            data: { reservedStock: Math.max(0, item.requestedVariant.reservedStock - item.quantity) },
          });
        }
      }

      return tx.returnRequest.update({
        where: { id: current.id },
        data: {
          status: "CANCELLED",
          events: {
            create: {
              status: "CANCELLED",
              message: "Request cancelled by customer before pickup processing",
              actor: customerEmail,
            },
          },
        },
        include: { events: { orderBy: { createdAt: "asc" } } },
      });
    });

    const cancellationEvent = updated.events.at(-1);
    if (cancellationEvent) {
      await sendReturnLifecycleNotification({ requestId: updated.id, eventId: cancellationEvent.id, orderId: order.id, orderNumber: order.orderNumber, recipient: customerEmail, status: updated.status, message: cancellationEvent.message, locale });
    }

    return NextResponse.json({
      message: "Your request was cancelled.",
      request: {
        status: updated.status,
        updatedAt: updated.updatedAt.toISOString(),
        events: updated.events.map((event) => ({
          id: event.id,
          status: event.status,
          message: event.message,
          createdAt: event.createdAt.toISOString(),
        })),
      },
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNKNOWN";
    if (code === "NOT_FOUND") return NextResponse.json({ message: "Return request not found." }, { status: 404 });
    if (code === "TOO_LATE") return NextResponse.json({ message: "This request can no longer be cancelled online because pickup or warehouse processing has started." }, { status: 409 });
    return NextResponse.json({ message: "Unable to cancel the request." }, { status: 500 });
  }
}
