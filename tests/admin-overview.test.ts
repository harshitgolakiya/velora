import { describe, expect, it } from "vitest";
import { buildAdminOverview } from "@/lib/admin-overview";
import type {
  AdminCartAnalytics,
  AdminCustomer,
  AdminInventoryRow,
  AdminOrder,
  AdminProduct,
} from "@/lib/admin-catalog";

const order = (overrides: Partial<AdminOrder>): AdminOrder => ({
  id: "order-1",
  orderNumber: "VL-1",
  customerName: "Customer",
  email: "customer@example.com",
  status: "PAID",
  paymentStatus: "paid",
  fulfillmentStatus: "unfulfilled",
  subtotal: 300,
  shippingTotal: 0,
  discountTotal: 0,
  total: 300,
  orderTags: [],
  items: [
    {
      id: "item-1",
      productId: "product-1",
      title: "Aura Legging",
      size: "M",
      color: "Ink",
      quantity: 2,
      unitPrice: 150,
    },
  ],
  createdAt: "2026-06-13T12:00:00.000Z",
  updatedAt: "2026-06-13T12:00:00.000Z",
  ...overrides,
});

const cartAnalytics: AdminCartAnalytics = {
  cartsStarted: 10,
  checkoutsStarted: 5,
  completedCarts: 3,
  abandonedCarts: 2,
  conversionRate: 30,
  checkoutConversionRate: 60,
  abandonedValue: 400,
  recentAbandoned: [],
};

describe("admin overview calculations", () => {
  it("uses paid non-cancelled orders for revenue and product sales", () => {
    const result = buildAdminOverview(
      {
        orders: [
          order({}),
          order({
            id: "cancelled",
            orderNumber: "VL-2",
            status: "CANCELLED",
            total: 900,
          }),
        ],
        customers: [] as AdminCustomer[],
        products: [] as AdminProduct[],
        inventory: [] as AdminInventoryRow[],
        cartAnalytics,
      },
      "Week",
      new Date("2026-06-14T12:00:00.000Z"),
    );

    expect(result.revenue).toBe(300);
    expect(result.topProducts[0]).toMatchObject({
      title: "Aura Legging",
      units: 2,
      revenue: 300,
    });
  });

  it("reports cart funnel and actionable inventory risk", () => {
    const inventory = [
      {
        status: "Low stock",
        availableStock: 2,
      },
      {
        status: "In stock",
        availableStock: 20,
      },
    ] as AdminInventoryRow[];

    const result = buildAdminOverview(
      {
        orders: [],
        customers: [],
        products: [],
        inventory,
        cartAnalytics,
      },
      "Month",
      new Date("2026-06-14T12:00:00.000Z"),
    );

    expect(result.funnel.map((step) => step.value)).toEqual([10, 5, 3]);
    expect(result.atRiskInventory).toHaveLength(1);
    expect(result.queue.find((item) => item.label === "Abandoned carts")?.value).toBe(2);
  });
});
