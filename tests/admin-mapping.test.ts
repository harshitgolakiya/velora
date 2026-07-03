import { describe, expect, it } from "vitest";
import { mapAdminActivityLog, mapAdminCustomers, mapAdminInventoryRow } from "@/lib/admin-catalog";

const address = {
  name: "Aisha Noor",
  phone: "+971500000000",
  line1: "Downtown",
  line2: null,
  city: "Dubai",
  country: "AE",
  postalCode: null,
};

function order(overrides: Record<string, unknown> = {}) {
  return {
    id: "order-1",
    orderNumber: "VEL-1001",
    email: "aisha@example.com",
    status: "DELIVERED",
    paymentStatus: "paid",
    fulfillmentStatus: "fulfilled",
    total: 650,
    internalNote: null,
    customerNote: null,
    orderTags: JSON.stringify(["VIP"]),
    refundAmount: null,
    createdAt: new Date("2026-06-01T10:00:00.000Z"),
    userId: null,
    shippingAddress: address,
    billingAddress: address,
    ...overrides,
  };
}

describe("admin mapping", () => {
  it("groups guest orders by normalized email and calculates lifetime value", () => {
    const customers = mapAdminCustomers([], [
      order(),
      order({
        id: "order-2",
        orderNumber: "VEL-1002",
        email: "AISHA@example.com",
        total: 400,
        createdAt: new Date("2026-06-10T10:00:00.000Z"),
      }),
    ]);

    expect(customers).toHaveLength(1);
    expect(customers[0]).toMatchObject({
      id: "guest:aisha@example.com",
      type: "Guest",
      orderCount: 2,
      lifetimeValue: 1050,
    });
    expect(customers[0].tags).toContain("VIP");
  });

  it("maps account profile notes and removes duplicate addresses", () => {
    const customers = mapAdminCustomers(
      [
        {
          id: "user-1",
          email: "member@example.com",
          name: "Member",
          addresses: [address, address],
          orders: [order({ userId: "user-1", email: "member@example.com" })],
          customerNotes: "Prefers WhatsApp",
          customerTags: JSON.stringify(["Stylist"]),
        },
      ],
      [],
    );

    expect(customers[0].addresses).toHaveLength(1);
    expect(customers[0].notes).toBe("Prefers WhatsApp");
    expect(customers[0].tags).toContain("Stylist");
  });

  it("calculates available inventory and low-stock status", () => {
    const mapped = mapAdminInventoryRow({
      id: "variant-1",
      sku: "AURA-INK-S",
      stock: 8,
      reservedStock: 4,
      lowStockThreshold: 5,
      allowBackorder: false,
      backorderLimit: 3,
      backorderShipsAt: new Date("2026-07-01T00:00:00.000Z"),
      backorderMessage: "Ships early July.",
      product: { id: "product-1", title: "Aura Legging", slug: "aura-legging", updatedAt: new Date("2026-06-01") },
      color: { name: "Ink", hex: "#111315" },
      size: { name: "S" },
      inventoryLogs: [],
    });

    expect(mapped.availableStock).toBe(4);
    expect(mapped.status).toBe("Low stock");
    expect(mapped.backorderLimit).toBe(3);
    expect(mapped.backorderShipsAt).toBe("2026-07-01T00:00:00.000Z");
    expect(mapped.backorderMessage).toBe("Ships early July.");
  });

  it("parses activity metadata and preserves malformed payloads", () => {
    const valid = mapAdminActivityLog({
      id: "log-1",
      actor: "Manager",
      action: "Updated order",
      entityType: "order",
      entityId: "order-1",
      metadata: JSON.stringify({ status: "SHIPPED" }),
      createdAt: new Date("2026-06-01T00:00:00.000Z"),
    });
    const malformed = mapAdminActivityLog({
      id: "log-2",
      actor: valid.actor,
      action: valid.action,
      entityType: valid.entityType,
      entityId: valid.entityId ?? null,
      createdAt: new Date(valid.createdAt),
      metadata: "broken",
    });

    expect(valid.metadata).toEqual({ status: "SHIPPED" });
    expect(malformed.metadata).toEqual({ raw: "broken" });
  });
});
