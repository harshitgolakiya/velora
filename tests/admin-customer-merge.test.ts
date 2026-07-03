import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  addressUpdateMany: vi.fn(),
  cartFindMany: vi.fn(),
  cartUpdateMany: vi.fn(),
  newsletterFindUnique: vi.fn(),
  orderFindMany: vi.fn(),
  orderUpdateMany: vi.fn(),
  productAlertFindMany: vi.fn(),
  productAlertUpdateMany: vi.fn(),
  recordAdminActivity: vi.fn(),
  requireAdminApiPermission: vi.fn(),
  transaction: vi.fn(),
  userFindUnique: vi.fn(),
  userUpdate: vi.fn(),
}));

vi.mock("@/lib/admin-api", () => ({
  requireAdminApiPermission: mocks.requireAdminApiPermission,
}));

vi.mock("@/lib/admin-activity", () => ({
  recordAdminActivity: mocks.recordAdminActivity,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    address: { updateMany: mocks.addressUpdateMany },
    cart: { findMany: mocks.cartFindMany, updateMany: mocks.cartUpdateMany },
    newsletterSubscriber: { findUnique: mocks.newsletterFindUnique },
    order: { findMany: mocks.orderFindMany, updateMany: mocks.orderUpdateMany },
    productAlertSubscription: {
      findMany: mocks.productAlertFindMany,
      updateMany: mocks.productAlertUpdateMany,
    },
    user: { findUnique: mocks.userFindUnique, update: mocks.userUpdate },
    $transaction: mocks.transaction,
  },
}));

async function postMerge(customerId = "user_1") {
  const { POST } = await import("@/app/api/admin/customers/[id]/route");
  return POST(
    new Request("https://velora.test/api/admin/customers/user_1", {
      method: "POST",
      body: JSON.stringify({ action: "merge_guest_orders" }),
    }),
    { params: Promise.resolve({ id: customerId }) },
  );
}

describe("admin customer merge route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdminApiPermission.mockResolvedValue({
      access: { name: "Ops Admin", email: "ops@example.com" },
    });
    mocks.userFindUnique.mockResolvedValue({
      id: "user_1",
      email: "customer@example.com",
      name: "Customer",
      marketingEmails: false,
    });
    mocks.orderFindMany.mockResolvedValue([
      { id: "order_1", shippingAddressId: "address_1", billingAddressId: "address_2" },
    ]);
    mocks.cartFindMany.mockResolvedValue([{ id: "cart_1" }]);
    mocks.productAlertFindMany.mockResolvedValue([{ id: "alert_1" }]);
    mocks.newsletterFindUnique.mockResolvedValue({ status: "SUBSCRIBED" });
    mocks.orderUpdateMany.mockResolvedValue({ count: 1 });
    mocks.addressUpdateMany.mockResolvedValue({ count: 2 });
    mocks.cartUpdateMany.mockResolvedValue({ count: 1 });
    mocks.productAlertUpdateMany.mockResolvedValue({ count: 1 });
    mocks.userUpdate.mockResolvedValue({ id: "user_1" });
    mocks.transaction.mockResolvedValue([]);
    mocks.recordAdminActivity.mockResolvedValue(undefined);
  });

  it("claims guest orders, carts, product alerts, and reconciles newsletter marketing preference", async () => {
    const response = await postMerge();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      mergedOrders: 1,
      mergedCarts: 1,
      mergedProductAlerts: 1,
      marketingEmails: true,
      mergedOrderIds: ["order_1"],
      mergedCartIds: ["cart_1"],
      mergedProductAlertIds: ["alert_1"],
      mergedAddressIds: ["address_1", "address_2"],
    });
    expect(mocks.orderUpdateMany).toHaveBeenCalledWith({
      where: { id: { in: ["order_1"] } },
      data: { userId: "user_1" },
    });
    expect(mocks.addressUpdateMany).toHaveBeenCalledWith({
      where: { id: { in: ["address_1", "address_2"] }, userId: null },
      data: { userId: "user_1" },
    });
    expect(mocks.cartUpdateMany).toHaveBeenCalledWith({
      where: { id: { in: ["cart_1"] }, userId: null },
      data: { userId: "user_1" },
    });
    expect(mocks.productAlertUpdateMany).toHaveBeenCalledWith({
      where: { id: { in: ["alert_1"] }, userId: null },
      data: { userId: "user_1" },
    });
    expect(mocks.userUpdate).toHaveBeenCalledWith({
      where: { id: "user_1" },
      data: { marketingEmails: true },
    });
    const transactionOperations = mocks.transaction.mock.calls[0]?.[0] as unknown[];
    expect(transactionOperations).toHaveLength(5);
    expect(mocks.recordAdminActivity).toHaveBeenCalledWith(expect.objectContaining({
      action: "Merged guest records into customer@example.com",
      entityType: "customer",
      entityId: "user_1",
      actor: "Ops Admin",
      metadata: expect.objectContaining({
        mergedOrderIds: ["order_1"],
        mergedCartIds: ["cart_1"],
        mergedProductAlertIds: ["alert_1"],
        marketingPreference: { previous: false, next: true, source: "newsletter_subscriber" },
      }),
    }));
  });
});
