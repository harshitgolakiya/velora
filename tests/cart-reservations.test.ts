import { ProductStatus } from "@prisma/client";
import { afterAll, describe, expect, it } from "vitest";
import {
  calculateAvailableStock,
  completeCartOrder,
  normalizeReservedStock,
  releaseReservedStockValue,
  syncCartReservations,
} from "@/lib/cart-reservations";
import { prisma } from "@/lib/prisma";

const suffix = `cart-reservation-${Date.now()}`;
const productIds: string[] = [];
const categoryIds: string[] = [];
const colorIds: string[] = [];
const sizeIds: string[] = [];

afterAll(async () => {
  await prisma.order.deleteMany({
    where: { orderNumber: { startsWith: `TEST-${suffix}` } },
  });
  await prisma.cart.deleteMany({
    where: { sessionKey: { startsWith: `test-${suffix}` } },
  });
  for (const id of productIds) await prisma.product.delete({ where: { id } }).catch(() => undefined);
  for (const id of categoryIds) await prisma.category.delete({ where: { id } }).catch(() => undefined);
  for (const id of colorIds) await prisma.color.delete({ where: { id } }).catch(() => undefined);
  for (const id of sizeIds) await prisma.size.delete({ where: { id } }).catch(() => undefined);
});

async function createReservableVariant(label: string, stock = 2) {
  const category = await prisma.category.create({
    data: {
      name: `Cart Reservation Category ${label} ${suffix}`,
      slug: `cart-reservation-category-${label}-${suffix}`,
    },
  });
  categoryIds.push(category.id);
  const color = await prisma.color.create({
    data: { name: `Cart Reservation Black ${label} ${suffix}`, hex: "#111111" },
  });
  colorIds.push(color.id);
  const size = await prisma.size.create({
    data: {
      id: `Cart-Reservation-${label}-S-${suffix}`,
      name: `Cart Reservation ${label} S ${suffix}`,
    },
  });
  sizeIds.push(size.id);
  const product = await prisma.product.create({
    data: {
      title: `Cart Reservation Product ${label} ${suffix}`,
      slug: `cart-reservation-product-${label}-${suffix}`,
      description: "Temporary cart reservation product.",
      price: 120,
      sku: `CART-RES-${label}-${suffix}`,
      fabricDetails: "Test fabric",
      careInstructions: "Test care",
      status: ProductStatus.PUBLISHED,
      categoryId: category.id,
      variants: {
        create: {
          colorId: color.id,
          sizeId: size.id,
          sku: `CART-RES-${label}-${suffix}-S-BLK`,
          stock,
        },
      },
    },
    include: { variants: true },
  });
  productIds.push(product.id);
  const variantId = product.variants[0]?.id;
  if (!variantId) throw new Error("Temporary variant was not created.");
  return { product, variantId };
}

describe("cart reservation stock math", () => {
  it("subtracts reservations owned by other carts", () => {
    expect(calculateAvailableStock(10, 4)).toBe(6);
  });

  it("returns the current cart reservation to its available allowance", () => {
    expect(calculateAvailableStock(10, 7, 3)).toBe(6);
  });

  it("never exposes negative availability", () => {
    expect(calculateAvailableStock(2, 5)).toBe(0);
  });

  it("treats legacy negative reserved stock as zero", () => {
    expect(normalizeReservedStock(-3)).toBe(0);
    expect(calculateAvailableStock(8, -3)).toBe(8);
  });

  it("never releases reserved stock below zero", () => {
    expect(releaseReservedStockValue(5, 2)).toBe(3);
    expect(releaseReservedStockValue(1, 4)).toBe(0);
    expect(releaseReservedStockValue(-2, 1)).toBe(0);
  });

  it("reserves stock atomically and rejects oversell attempts", async () => {
    const { variantId } = await createReservableVariant("reserve", 2);

    await syncCartReservations(`test-${suffix}-one`, [
      { variantId: variantId!, quantity: 2 },
    ]);
    await expect(
      syncCartReservations(`test-${suffix}-two`, [
        { variantId: variantId!, quantity: 1 },
      ]),
    ).rejects.toThrow(/available|requested quantity/);

    const reserved = await prisma.productVariant.findUniqueOrThrow({
      where: { id: variantId! },
      select: { reservedStock: true },
    });
    expect(reserved.reservedStock).toBe(2);
  });

  it("allows only one concurrent cart to reserve the last unit", async () => {
    const { variantId } = await createReservableVariant("concurrent", 1);
    const results = await Promise.allSettled([
      syncCartReservations(`test-${suffix}-concurrent-a`, [
        { variantId, quantity: 1 },
      ]),
      syncCartReservations(`test-${suffix}-concurrent-b`, [
        { variantId, quantity: 1 },
      ]),
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);

    const variant = await prisma.productVariant.findUniqueOrThrow({
      where: { id: variantId },
      select: { reservedStock: true },
    });
    expect(variant.reservedStock).toBe(1);
  });

  it("commits reserved stock on checkout without underflowing reserved stock", async () => {
    const { variantId } = await createReservableVariant("checkout", 1);
    const sessionKey = `test-${suffix}-checkout`;

    const reservation = await syncCartReservations(sessionKey, [
      { variantId, quantity: 1 },
    ]);
    const order = await prisma.order.create({
      data: {
        orderNumber: `TEST-${suffix}-CHECKOUT`,
        email: "checkout@example.com",
        subtotal: 120,
        shippingTotal: 0,
        discountTotal: 0,
        total: 120,
        cartId: reservation.id,
      },
    });

    await completeCartOrder(order.id, `pi_test_${suffix}`);

    const variant = await prisma.productVariant.findUniqueOrThrow({
      where: { id: variantId },
      select: { stock: true, reservedStock: true },
    });
    expect(variant).toEqual({ stock: 0, reservedStock: 0 });

    const completedOrder = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
      include: { payment: true, cart: true },
    });
    expect(completedOrder.status).toBe("PAID");
    expect(completedOrder.paymentStatus).toBe("paid");
    expect(completedOrder.cart?.status).toBe("COMPLETED");
    expect(completedOrder.payment).toMatchObject({
      provider: "stripe",
      providerRef: `pi_test_${suffix}`,
      status: "paid",
    });
  });
});
