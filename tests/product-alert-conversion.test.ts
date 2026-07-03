import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ updateMany: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { productAlertDelivery: { updateMany: mocks.updateMany } } }));
vi.mock("@/lib/email-delivery", () => ({ deliverEmail: vi.fn() }));

import { attributeProductAlertConversions } from "@/lib/product-alert-queue";

describe("product alert conversion attribution", () => {
  it("attributes clicked sent alerts for purchased products and customer email", async () => {
    mocks.updateMany.mockResolvedValue({ count: 1 });
    await expect(attributeProductAlertConversions({
      email: "CUSTOMER@EXAMPLE.COM",
      productIds: ["product-1", "product-1", "product-2"],
    })).resolves.toBe(1);

    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        status: "SENT",
        clickedAt: { not: null },
        convertedAt: null,
        subscription: {
          email: "customer@example.com",
          productId: { in: ["product-1", "product-2"] },
        },
      }),
      data: { convertedAt: expect.any(Date) },
    });
  });

  it("does not query when the order has no products", async () => {
    mocks.updateMany.mockClear();
    await expect(attributeProductAlertConversions({ email: "customer@example.com", productIds: [] })).resolves.toBe(0);
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });
});
