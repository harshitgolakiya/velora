import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createProviderRefund,
  getAuthorizedAccountOrder,
  getReturnSettings,
  prisma,
  recordAdminActivity,
  requireCustomerSession,
  refundGiftCardsForOrderTx,
  sendRefundNotificationEmail,
  sendReturnLifecycleNotification,
} = vi.hoisted(() => ({
  createProviderRefund: vi.fn(),
  getAuthorizedAccountOrder: vi.fn(),
  getReturnSettings: vi.fn(),
  prisma: {
    $transaction: vi.fn(),
    returnRequest: { findUnique: vi.fn() },
    returnRequestEvent: { findFirst: vi.fn() },
  },
  recordAdminActivity: vi.fn(),
  requireCustomerSession: vi.fn(),
  refundGiftCardsForOrderTx: vi.fn(),
  sendRefundNotificationEmail: vi.fn(),
  sendReturnLifecycleNotification: vi.fn(),
}));

vi.mock("@/lib/account-data", () => ({ requireCustomerSession }));
vi.mock("@/lib/account-orders", () => ({ getAuthorizedAccountOrder }));
vi.mock("@/lib/admin-api", () => ({
  requireAdminApiPermission: vi.fn().mockResolvedValue({
    access: { name: "Returns manager" },
  }),
}));
vi.mock("@/lib/admin-activity", () => ({ recordAdminActivity }));
vi.mock("@/lib/gift-cards", () => ({ refundGiftCardsForOrderTx }));
vi.mock("@/lib/prisma", () => ({ prisma }));
vi.mock("@/lib/refund-email", () => ({ sendRefundNotificationEmail }));
vi.mock("@/lib/refund-provider", () => ({ createProviderRefund }));
vi.mock("@/lib/return-notifications", () => ({ sendReturnLifecycleNotification }));
vi.mock("@/lib/store-settings", () => ({ getReturnSettings }));

import { POST as submitReturnRequest } from "@/app/api/account/orders/[orderNumber]/return-request/route";
import { PATCH as updateReturnRequest } from "@/app/api/admin/returns/[id]/route";
import { POST as issueReturnRefund } from "@/app/api/admin/returns/[id]/refund/route";

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/admin/returns/return-1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("return request end-to-end reconciliation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireCustomerSession.mockResolvedValue({ user: { id: "user-1", email: "customer@example.com" } });
    getReturnSettings.mockResolvedValue({
      returnsEnabled: true,
      exchangesEnabled: true,
      refundsEnabled: true,
      returnWindowDays: 14,
      requireDeliveredOrder: true,
      allowDefectClaimsOutsideWindow: true,
      requireOriginalTags: true,
      policySummary: "Items must be unworn, unwashed, and returned with original tags.",
    });
  });

  it("moves an exchange from customer request through decision, pickup, inspection, and linked replacement order", async () => {
    const variant = {
      id: "variant-replacement",
      productId: "product-1",
      stock: 5,
      reservedStock: 0,
      allowBackorder: false,
      color: { name: "Black" },
      size: { name: "M" },
    };
    const state: {
      status: string;
      decisionAt: Date | null;
      completedAt: Date | null;
      replacementOrderId: string | null;
      replacementOrder: null | {
        id: string;
        orderNumber: string;
        status: string;
        fulfillmentStatus: string;
        shipment: { status: string; trackingNo: string | null };
      };
      returnShipment: null | {
        id: string;
        requestId: string;
        status: string;
        carrier: string | null;
        trackingNo: string | null;
        pickupStart: Date | null;
        pickupEnd: Date | null;
        labelId: string | null;
      };
      inspection: null | {
        condition: string;
        disposition: string;
        notes: string | null;
        inspectedBy: string;
        inspectedAt: Date;
      };
      events: Array<{ id: string; status: string; message: string; actor: string; createdAt: Date }>;
    } = {
      status: "PENDING",
      decisionAt: null,
      completedAt: null,
      replacementOrderId: null,
      replacementOrder: null,
      returnShipment: null,
      inspection: null,
      events: [],
    };
    getAuthorizedAccountOrder.mockResolvedValue({
      id: "order-1",
      orderNumber: "VL-100",
      status: "DELIVERED",
      orderTags: "",
      customerNote: null,
      shipment: { deliveredAt: new Date() },
      returnRequests: [],
      items: [{
        id: "order-item-1",
        title: "Sculpt Legging",
        quantity: 1,
        color: "Black",
        size: "S",
        variantId: "variant-original",
        product: {
          variants: [
            { ...variant },
            { id: "variant-original", color: { name: "Black" }, size: { name: "S" }, stock: 1, reservedStock: 0, allowBackorder: false },
          ],
        },
      }],
    });
    prisma.returnRequestEvent.findFirst.mockResolvedValue({
      id: "event-submit",
      requestId: "return-abc123",
      status: "PENDING",
      message: "Request submitted for review",
      createdAt: new Date("2026-06-22T09:00:00.000Z"),
    });

    const productVariantUpdate = vi.fn(async ({ data }) => {
      if (data.reservedStock?.increment) variant.reservedStock += data.reservedStock.increment;
      if (data.reservedStock?.decrement) variant.reservedStock -= data.reservedStock.decrement;
      if (data.stock?.decrement) variant.stock -= data.stock.decrement;
      return variant;
    });
    const orderCreate = vi.fn(async ({ data }) => {
      state.replacementOrder = {
        id: "replacement-1",
        orderNumber: data.orderNumber,
        status: data.status,
        fulfillmentStatus: data.fulfillmentStatus,
        shipment: { status: "pending", trackingNo: null },
      };
      return { id: "replacement-1", orderNumber: data.orderNumber };
    });

    const tx = {
      productVariant: { update: productVariantUpdate },
      order: {
        create: orderCreate,
        update: vi.fn(async ({ data }) => {
          expect(data.orderTags).toContain("exchange_requested");
          return { orderTags: data.orderTags };
        }),
      },
      returnInspection: {
        upsert: vi.fn(async ({ create, update }) => {
          state.inspection = {
            condition: create?.condition ?? update.condition,
            disposition: create?.disposition ?? update.disposition,
            notes: create?.notes ?? update.notes ?? null,
            inspectedBy: create?.inspectedBy ?? update.inspectedBy,
            inspectedAt: new Date("2026-06-22T10:00:00.000Z"),
          };
          return state.inspection;
        }),
      },
      returnRequest: {
        create: vi.fn(async ({ data }) => {
          expect(data).toMatchObject({
            orderId: "order-1",
            resolution: "EXCHANGE",
            reason: "Fit issue",
            items: { create: [{ orderItemId: "order-item-1", quantity: 1, requestedVariantId: "variant-replacement", requestedSize: "M" }] },
          });
          return { id: "return-abc123" };
        }),
        findUnique: vi.fn(async () => ({
          id: "return-abc123",
          orderId: "order-1",
          resolution: "EXCHANGE",
          status: state.status,
          adminNote: null,
          externalReference: null,
          decisionAt: state.decisionAt,
          completedAt: state.completedAt,
          replacementOrderId: state.replacementOrderId,
          replacementOrder: state.replacementOrder,
          returnShipment: state.returnShipment,
          inspection: state.inspection,
          order: {
            id: "order-1",
            orderNumber: "VL-100",
            userId: "user-1",
            email: "customer@example.com",
            locale: "en",
            shippingAddressId: "address-1",
            billingAddressId: "address-1",
          },
          items: [{
            quantity: 1,
            requestedVariantId: variant.id,
            requestedVariant: variant,
            orderItem: { title: "Sculpt Legging" },
          }],
        })),
        update: vi.fn(async ({ data }) => {
          state.status = data.status;
          state.replacementOrderId = data.replacementOrderId ?? state.replacementOrderId;
          state.decisionAt = data.decisionAt ?? state.decisionAt;
          state.completedAt = data.completedAt ?? state.completedAt;
          const event = data.events?.create;
          if (event) {
            state.events.push({
              id: `event-${state.events.length + 1}`,
              status: event.status,
              message: event.message,
              actor: event.actor,
              createdAt: new Date("2026-06-22T10:00:00.000Z"),
            });
          }
          return {
            id: "return-abc123",
            status: state.status,
            adminNote: null,
            externalReference: null,
            decisionAt: state.decisionAt,
            completedAt: state.completedAt,
            updatedAt: new Date("2026-06-22T10:00:00.000Z"),
            events: state.events,
            replacementOrder: state.replacementOrder,
            returnShipment: state.returnShipment,
            inspection: state.inspection,
            order: { id: "order-1", orderNumber: "VL-100", email: "customer@example.com", locale: "en" },
          };
        }),
      },
      returnShipment: {
        update: vi.fn(async ({ data }) => {
          state.returnShipment = { ...state.returnShipment!, ...data };
          return state.returnShipment;
        }),
        upsert: vi.fn(async ({ create, update }) => {
          state.returnShipment = {
            id: "shipment-1",
            requestId: "return-abc123",
            labelId: null,
            trackingNo: create.trackingNo ?? update.trackingNo ?? null,
            carrier: create.carrier ?? update.carrier,
            pickupStart: create.pickupStart ?? update.pickupStart,
            pickupEnd: create.pickupEnd ?? update.pickupEnd,
            status: create.status ?? update.status,
          };
          return state.returnShipment;
        }),
      },
    };
    prisma.$transaction.mockImplementation(async (callback) => callback(tx));

    const submitResponse = await submitReturnRequest(new Request("http://localhost/api/account/orders/VL-100/return-request", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Origin": "http://localhost" },
      body: JSON.stringify({
        resolution: "exchange",
        reason: "Fit issue",
        itemIds: ["order-item-1"],
        itemQuantities: [{ orderItemId: "order-item-1", quantity: 1 }],
        exchangeSelections: [{ orderItemId: "order-item-1", requestedVariantId: "variant-replacement" }],
      }),
    }), { params: Promise.resolve({ orderNumber: "VL-100" }) });
    expect(submitResponse.status).toBe(200);
    expect(sendReturnLifecycleNotification).toHaveBeenCalledWith(expect.objectContaining({
      requestId: "return-abc123",
      eventId: "event-submit",
      status: "PENDING",
    }));
    sendReturnLifecycleNotification.mockClear();

    const steps = [
      { status: "APPROVED" },
      {
        status: "PICKUP_SCHEDULED",
        pickupStart: "2026-06-23T09:00:00.000Z",
        pickupEnd: "2026-06-23T13:00:00.000Z",
        carrier: "Velora Returns",
      },
      { status: "PICKED_UP" },
      { status: "RECEIVED" },
      { status: "INSPECTED", inspectionCondition: "GOOD", disposition: "RESTOCK", inspectionNotes: "Sellable" },
      { status: "REPLACEMENT_CREATED" },
    ];

    const responses = [];
    for (const step of steps) {
      responses.push(await updateReturnRequest(jsonRequest(step), { params: Promise.resolve({ id: "return-abc123" }) }));
    }

    expect(responses.every((response) => response.status === 200)).toBe(true);
    expect(productVariantUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "variant-replacement" },
      data: { reservedStock: { increment: 1 } },
    }));
    expect(productVariantUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "variant-replacement" },
      data: expect.objectContaining({ stock: { decrement: 1 }, reservedStock: { decrement: 1 } }),
    }));
    expect(orderCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        orderNumber: "EX-VL-100-ABC123",
        paymentStatus: "exchange_no_charge",
        orderTags: "exchange_replacement",
        total: 0,
      }),
    }));
    expect(state).toMatchObject({
      status: "REPLACEMENT_CREATED",
      replacementOrderId: "replacement-1",
      returnShipment: { status: "received", carrier: "Velora Returns" },
      inspection: { condition: "GOOD", disposition: "RESTOCK", inspectedBy: "Returns manager" },
    });
    expect(variant).toMatchObject({ stock: 4, reservedStock: 0 });
    expect(recordAdminActivity).toHaveBeenCalledTimes(steps.length);
    expect(sendReturnLifecycleNotification).toHaveBeenCalledTimes(steps.length);
  });

  it("reconciles a completed refund across payment, order, email, gift card, and audit records", async () => {
    createProviderRefund.mockResolvedValue({
      provider: "stripe",
      providerRef: "re_123",
      status: "COMPLETED",
      note: "Stripe refund completed.",
    });
    prisma.returnRequest.findUnique.mockResolvedValue({
      id: "return-refund",
      orderId: "order-1",
      resolution: "REFUND",
      status: "INSPECTED",
      integrationStatus: null,
      externalReference: null,
      inspection: { disposition: "RESTOCK" },
      refund: null,
      items: [{ quantity: 1, orderItem: { unitPrice: 120 } }],
      order: {
        id: "order-1",
        orderNumber: "VL-200",
        email: "customer@example.com",
        locale: "en",
        total: 200,
        giftCardTotal: 50,
        payment: { provider: "stripe", providerRef: "pi_123" },
        refunds: [{ status: "COMPLETED", amount: 25 }],
      },
    });

    const refund = {
      id: "refund-1",
      amount: 100,
      kind: "PARTIAL",
      status: "COMPLETED",
      provider: "stripe",
      providerRef: "re_123",
      note: "Stripe refund completed.",
      updatedAt: new Date("2026-06-22T10:00:00.000Z"),
    };
    const refundCreate = vi.fn().mockResolvedValue(refund);
    const orderUpdate = vi.fn().mockResolvedValue({});
    const returnRequestUpdate = vi.fn().mockResolvedValue({});
    prisma.$transaction.mockImplementation(async (callback) => callback({
      refundRecord: { create: refundCreate },
      order: { update: orderUpdate },
      returnRequest: { update: returnRequestUpdate },
    }));

    const response = await issueReturnRefund(new Request("http://localhost/api/admin/returns/return-refund/refund", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: 100 }),
    }), { params: Promise.resolve({ id: "return-refund" }) });

    expect(response.status).toBe(200);
    expect(createProviderRefund).toHaveBeenCalledWith(expect.objectContaining({
      paymentProvider: "stripe",
      paymentReference: "pi_123",
      amount: 100,
      returnRequestId: "return-refund",
    }));
    expect(refundCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        orderId: "order-1",
        returnRequestId: "return-refund",
        amount: 100,
        kind: "PARTIAL",
        status: "COMPLETED",
        providerRef: "re_123",
      }),
    }));
    expect(orderUpdate).toHaveBeenCalledWith({
      where: { id: "order-1" },
      data: { refundAmount: 125, paymentStatus: "partially_refunded" },
    });
    expect(refundGiftCardsForOrderTx).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      orderId: "order-1",
      amount: 20,
      actor: "Returns manager",
    }));
    expect(returnRequestUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "return-refund" },
      data: expect.objectContaining({
        status: "COMPLETED",
        integrationStatus: "COMPLETED",
        externalReference: "re_123",
        events: {
          create: [
            expect.objectContaining({ status: "REFUND_PROCESSING" }),
            expect.objectContaining({ status: "COMPLETED" }),
          ],
        },
      }),
    }));
    expect(recordAdminActivity).toHaveBeenCalledWith(expect.objectContaining({
      action: "Started refund for VL-200",
      entityId: "return-refund",
      metadata: expect.objectContaining({ amount: 100, provider: "stripe", status: "COMPLETED" }),
    }));
    expect(sendRefundNotificationEmail).toHaveBeenCalledWith(expect.objectContaining({
      recipient: "customer@example.com",
      orderNumber: "VL-200",
      refundId: "refund-1",
      amount: 100,
      totalRefunded: 125,
      kind: "PARTIAL",
    }));
    await expect(response.json()).resolves.toMatchObject({ requestStatus: "COMPLETED", refund: { id: "refund-1" } });
  });
});
