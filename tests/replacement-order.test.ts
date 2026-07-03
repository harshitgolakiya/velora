import { beforeEach, describe, expect, it, vi } from "vitest";

const { transaction, recordAdminActivity } = vi.hoisted(() => ({
  transaction: vi.fn(),
  recordAdminActivity: vi.fn(),
}));

vi.mock("@/lib/admin-api", () => ({
  requireAdminApiPermission: vi.fn().mockResolvedValue({
    access: { name: "Returns manager" },
  }),
}));

vi.mock("@/lib/admin-activity", () => ({ recordAdminActivity }));
vi.mock("@/lib/return-notifications", () => ({ sendReturnLifecycleNotification: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: transaction } }));

import { PATCH } from "@/app/api/admin/returns/[id]/route";

describe("exchange replacement order", () => {
  beforeEach(() => {
    transaction.mockReset();
    recordAdminActivity.mockReset();
  });

  it("creates a linked no-charge order and consumes reserved inventory", async () => {
    const productVariantUpdate = vi.fn().mockResolvedValue({});
    const orderCreate = vi.fn().mockResolvedValue({ id: "replacement-1", orderNumber: "EX-VL-100-ABC123" });
    const returnRequestUpdate = vi.fn().mockResolvedValue({
      id: "return-abc123",
      status: "REPLACEMENT_CREATED",
      adminNote: null,
      externalReference: null,
      decisionAt: new Date("2026-06-20T08:00:00.000Z"),
      completedAt: null,
      updatedAt: new Date("2026-06-20T09:00:00.000Z"),
      events: [],
      replacementOrder: {
        id: "replacement-1",
        orderNumber: "EX-VL-100-ABC123",
        status: "PROCESSING",
        fulfillmentStatus: "unfulfilled",
        shipment: { status: "pending", trackingNo: null },
      },
    });
    const tx = {
      returnRequest: {
        findUnique: vi.fn().mockResolvedValue({
          id: "return-abc123",
          orderId: "order-1",
          replacementOrderId: null,
          replacementOrder: null,
          resolution: "EXCHANGE",
          status: "INSPECTED",
          inspection: { condition: "GOOD", disposition: "RESTOCK" },
          adminNote: null,
          externalReference: null,
          decisionAt: new Date("2026-06-20T08:00:00.000Z"),
          completedAt: null,
          order: {
            id: "order-1",
            orderNumber: "VL-100",
            userId: "user-1",
            email: "customer@example.com",
            shippingAddressId: "address-1",
            billingAddressId: "address-1",
          },
          items: [{
            quantity: 1,
            requestedVariantId: "variant-2",
            requestedVariant: {
              id: "variant-2",
              productId: "product-1",
              stock: 4,
              reservedStock: 1,
              allowBackorder: false,
              color: { name: "Black" },
              size: { name: "M" },
            },
            orderItem: { title: "Sculpt Legging" },
          }],
        }),
        update: returnRequestUpdate,
      },
      productVariant: { update: productVariantUpdate },
      order: { create: orderCreate },
    };
    transaction.mockImplementation(async (callback) => callback(tx));

    const response = await PATCH(new Request("http://localhost/api/admin/returns/return-abc123", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "REPLACEMENT_CREATED" }),
    }), { params: Promise.resolve({ id: "return-abc123" }) });

    expect(response.status).toBe(200);
    expect(productVariantUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "variant-2" },
      data: expect.objectContaining({ stock: { decrement: 1 }, reservedStock: { decrement: 1 } }),
    }));
    expect(orderCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        orderNumber: "EX-VL-100-ABC123",
        total: 0,
        paymentStatus: "exchange_no_charge",
        orderTags: "exchange_replacement",
      }),
    }));
    expect(returnRequestUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ replacementOrderId: "replacement-1" }),
    }));
    expect(await response.json()).toMatchObject({ request: { replacementOrder: { orderNumber: "EX-VL-100-ABC123" } } });
  });

  it("creates a return shipment when pickup is scheduled", async () => {
    const shipment = {
      id: "return-shipment-1",
      status: "pickup_scheduled",
      carrier: "Velora Returns",
      trackingNo: null,
      pickupStart: new Date("2026-06-22T08:00:00.000Z"),
      pickupEnd: new Date("2026-06-22T12:00:00.000Z"),
      labelId: null,
    };
    const returnShipmentUpsert = vi.fn().mockResolvedValue(shipment);
    const tx = {
      returnRequest: {
        findUnique: vi.fn().mockResolvedValue({
          id: "return-1",
          resolution: "RETURN",
          status: "APPROVED",
          adminNote: null,
          externalReference: null,
          replacementOrderId: null,
          replacementOrder: null,
          returnShipment: null,
          decisionAt: new Date("2026-06-20T08:00:00.000Z"),
          completedAt: null,
          order: { orderNumber: "VL-100" },
          items: [],
        }),
        update: vi.fn().mockResolvedValue({
          id: "return-1",
          status: "PICKUP_SCHEDULED",
          adminNote: null,
          externalReference: null,
          decisionAt: new Date("2026-06-20T08:00:00.000Z"),
          completedAt: null,
          updatedAt: new Date("2026-06-20T09:00:00.000Z"),
          events: [],
          replacementOrder: null,
          returnShipment: shipment,
        }),
      },
      returnShipment: { upsert: returnShipmentUpsert },
    };
    transaction.mockImplementation(async (callback) => callback(tx));

    const response = await PATCH(new Request("http://localhost/api/admin/returns/return-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "PICKUP_SCHEDULED",
        pickupStart: "2026-06-22T12:00:00+04:00",
        pickupEnd: "2026-06-22T16:00:00+04:00",
        carrier: "Velora Returns",
      }),
    }), { params: Promise.resolve({ id: "return-1" }) });

    expect(response.status).toBe(200);
    expect(returnShipmentUpsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { requestId: "return-1" },
      create: expect.objectContaining({ status: "pickup_scheduled", carrier: "Velora Returns" }),
    }));
  });

  it("records warehouse condition and disposition before resolution", async () => {
    const inspectionUpsert = vi.fn().mockResolvedValue({});
    const inspection = { condition: "GOOD", disposition: "RESTOCK", notes: "Tags attached", inspectedBy: "Returns manager", inspectedAt: new Date("2026-06-22T12:00:00.000Z") };
    const tx = {
      returnRequest: {
        findUnique: vi.fn().mockResolvedValue({
          id: "return-1",
          resolution: "REFUND",
          status: "RECEIVED",
          adminNote: null,
          externalReference: null,
          replacementOrderId: null,
          replacementOrder: null,
          returnShipment: { status: "received" },
          inspection: null,
          decisionAt: new Date(),
          completedAt: null,
          order: { orderNumber: "VL-100" },
          items: [],
        }),
        update: vi.fn().mockResolvedValue({
          id: "return-1", status: "INSPECTED", adminNote: null, externalReference: null,
          decisionAt: new Date(), completedAt: null, updatedAt: new Date(), events: [],
          replacementOrder: null, returnShipment: { status: "received" }, inspection,
        }),
      },
      returnInspection: { upsert: inspectionUpsert },
    };
    transaction.mockImplementation(async (callback) => callback(tx));

    const response = await PATCH(new Request("http://localhost/api/admin/returns/return-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "INSPECTED", inspectionCondition: "GOOD", disposition: "RESTOCK", inspectionNotes: "Tags attached" }),
    }), { params: Promise.resolve({ id: "return-1" }) });

    expect(response.status).toBe(200);
    expect(inspectionUpsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ condition: "GOOD", disposition: "RESTOCK", inspectedBy: "Returns manager" }),
    }));
  });
});
