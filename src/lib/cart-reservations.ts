import { CartStatus, Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { queueAutomationEvent } from "./automation-events";
import { finalizeGiftCardRedemptionsTx, releaseGiftCardHoldsTx } from "./gift-cards";

export const CART_RESERVATION_MINUTES = 30;
export const ABANDONED_CART_HOURS = 24;

export type CartReservationLine = {
  variantId: string;
  quantity: number;
};

const reservationExpiry = () =>
  new Date(Date.now() + CART_RESERVATION_MINUTES * 60_000);

export function calculateAvailableStock(
  stock: number,
  reservedStock: number,
  ownedReservation = 0,
) {
  return Math.max(0, stock - normalizeReservedStock(reservedStock) + ownedReservation);
}

export function calculateSellableStock(
  stock: number,
  reservedStock: number,
  options: {
    allowBackorder?: boolean;
    backorderLimit?: number | null;
    ownedReservation?: number;
  } = {},
) {
  const ownedReservation = options.ownedReservation ?? 0;
  if (!options.allowBackorder) {
    return calculateAvailableStock(stock, reservedStock, ownedReservation);
  }
  if (options.backorderLimit == null) return Number.POSITIVE_INFINITY;
  return Math.max(
    0,
    stock + options.backorderLimit - normalizeReservedStock(reservedStock) + ownedReservation,
  );
}

export function normalizeReservedStock(reservedStock: number) {
  return Math.max(0, reservedStock);
}

export function releaseReservedStockValue(
  reservedStock: number,
  quantity: number,
) {
  return Math.max(0, reservedStock - Math.max(0, quantity));
}

export async function repairNegativeReservedStock() {
  return prisma.productVariant.updateMany({
    where: { reservedStock: { lt: 0 } },
    data: { reservedStock: 0 },
  });
}

async function releaseVariantReservedStock(
  tx: Prisma.TransactionClient,
  variantId: string,
  quantity: number,
) {
  const variant = await tx.productVariant.findUnique({
    where: { id: variantId },
    select: { reservedStock: true },
  });
  if (!variant) return;
  await tx.productVariant.update({
    where: { id: variantId },
    data: {
      reservedStock: releaseReservedStockValue(variant.reservedStock, quantity),
    },
  });
}

async function reserveVariantStockAtomically(
  tx: Prisma.TransactionClient,
  variantId: string,
  quantity: number,
) {
  if (quantity <= 0) return true;
  const updated = await tx.$executeRaw`
    UPDATE "ProductVariant"
    SET "reservedStock" = "reservedStock" + ${quantity}
    WHERE "id" = ${variantId}
      AND (
        ("allowBackorder" = 0 AND ("stock" - "reservedStock") >= ${quantity})
        OR (
          "allowBackorder" = 1
          AND (
            "backorderLimit" IS NULL
            OR ("stock" + "backorderLimit" - "reservedStock") >= ${quantity}
          )
        )
      )
  `;
  return updated === 1;
}

async function commitVariantStockAtomically(
  tx: Prisma.TransactionClient,
  variantId: string,
  quantity: number,
) {
  if (quantity <= 0) return true;
  const updated = await tx.$executeRaw`
    UPDATE "ProductVariant"
    SET
      "stock" = "stock" - ${quantity},
      "reservedStock" = CASE
        WHEN "reservedStock" - ${quantity} < 0 THEN 0
        ELSE "reservedStock" - ${quantity}
      END
    WHERE "id" = ${variantId}
      AND ("allowBackorder" = 1 OR "stock" >= ${quantity})
  `;
  return updated === 1;
}

async function releaseCartReservations(
  tx: Prisma.TransactionClient,
  cart: {
    id: string;
    order?: { id: string } | null;
    items: Array<{ variantId: string; quantity: number }>;
  },
  status: CartStatus,
) {
  for (const item of cart.items) {
    await releaseVariantReservedStock(tx, item.variantId, item.quantity);
  }
  if (cart.order?.id) {
    await releaseGiftCardHoldsTx(tx, cart.order.id, "Checkout expiry");
  }

  await tx.cart.update({
    where: { id: cart.id },
    data: {
      status,
      abandonedAt: status === CartStatus.ABANDONED ? new Date() : undefined,
    },
  });
}

export async function expireStaleCartReservations(now = new Date()) {
  await repairNegativeReservedStock();

  const stale = await prisma.cart.findMany({
    where: {
      status: { in: [CartStatus.ACTIVE, CartStatus.CHECKOUT] },
      expiresAt: { lt: now },
    },
    include: {
      order: { select: { id: true } },
      items: { select: { variantId: true, quantity: true, unitPrice: true } },
    },
  });

  for (const cart of stale) {
    const abandoned = cart.items.length > 0;
    await prisma.$transaction((tx) =>
      releaseCartReservations(
        tx,
        cart,
        abandoned ? CartStatus.ABANDONED : CartStatus.EXPIRED,
      ),
    );
    if (abandoned && cart.email) {
      await queueAutomationEvent({
        type: "ABANDONED_CART",
        sourceKey: `abandoned:${cart.id}`,
        recipient: cart.email,
        cartId: cart.id,
        metadata: {
          cartValue: cart.items.reduce((sum, item) => sum + Number(item.unitPrice) * item.quantity, 0),
        },
      });
    }
  }

  return stale.length;
}

export async function syncCartReservations(
  sessionKey: string,
  lines: CartReservationLine[],
) {
  await expireStaleCartReservations();

  const normalized = Array.from(
    lines.reduce((map, line) => {
      map.set(line.variantId, (map.get(line.variantId) ?? 0) + line.quantity);
      return map;
    }, new Map<string, number>()),
  ).map(([variantId, quantity]) => ({ variantId, quantity }));

  return prisma.$transaction(async (tx) => {
    const existing = await tx.cart.findUnique({
      where: { sessionKey },
      include: { items: true },
    });
    if (existing?.status === CartStatus.COMPLETED) {
      throw new Error("This cart has already been completed.");
    }

    const variants = normalized.length
      ? await tx.productVariant.findMany({
          where: { id: { in: normalized.map((line) => line.variantId) } },
          include: { product: true, color: true, size: true },
        })
      : [];
    const variantById = new Map(variants.map((variant) => [variant.id, variant]));
    const existingByVariant = new Map(
      existing?.items.map((item) => [item.variantId, item.quantity]) ?? [],
    );

    for (const line of normalized) {
      const variant = variantById.get(line.variantId);
      if (!variant) throw new Error("A selected product variant no longer exists.");
      const owned = existingByVariant.get(line.variantId) ?? 0;
      const available = calculateSellableStock(
        variant.stock,
        variant.reservedStock,
        {
          allowBackorder: variant.allowBackorder,
          backorderLimit: variant.backorderLimit,
          ownedReservation: owned,
        },
      );
      if (line.quantity > available) {
        throw new Error(
          `${variant.product.title} (${variant.color.name}/${variant.size.name}) only has ${available} available.`,
        );
      }
    }

    const allVariantIds = new Set([
      ...existingByVariant.keys(),
      ...normalized.map((line) => line.variantId),
    ]);
    const requestedByVariant = new Map(
      normalized.map((line) => [line.variantId, line.quantity]),
    );
    for (const variantId of allVariantIds) {
      const delta =
        (requestedByVariant.get(variantId) ?? 0) -
        (existingByVariant.get(variantId) ?? 0);
      if (delta !== 0) {
        if (delta > 0) {
          const reserved = await reserveVariantStockAtomically(
            tx,
            variantId,
            delta,
          );
          if (!reserved) {
            const variant = variantById.get(variantId);
            throw new Error(
              variant
                ? `${variant.product.title} (${variant.color.name}/${variant.size.name}) is no longer available in the requested quantity.`
                : "A selected product variant is no longer available in the requested quantity.",
            );
          }
        } else {
          await releaseVariantReservedStock(tx, variantId, Math.abs(delta));
        }
      }
    }

    const cart = existing
      ? await tx.cart.update({
          where: { id: existing.id },
          data: {
            status: CartStatus.ACTIVE,
            expiresAt: reservationExpiry(),
            abandonedAt: null,
          },
        })
      : await tx.cart.create({
          data: {
            sessionKey,
            status: CartStatus.ACTIVE,
            expiresAt: reservationExpiry(),
          },
        });

    await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
    if (normalized.length) {
      await tx.cartItem.createMany({
        data: normalized.map((line) => {
          const variant = variantById.get(line.variantId)!;
          return {
            cartId: cart.id,
            productId: variant.productId,
            variantId: variant.id,
            size: variant.size.name,
            color: variant.color.name,
            quantity: line.quantity,
            unitPrice: variant.product.salePrice ?? variant.product.price,
          };
        }),
      });
    }

    return {
      id: cart.id,
      sessionKey,
      expiresAt: cart.expiresAt.toISOString(),
      items: normalized,
    };
  });
}

export async function completeCartOrder(orderId: string, providerRef?: string) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { cart: { include: { items: true } }, payment: true },
    });
    if (!order) throw new Error("Order not found.");
    if (!order.cart || order.cart.status === CartStatus.COMPLETED) return order;

    for (const item of order.cart.items) {
      const variant = await tx.productVariant.findUniqueOrThrow({
        where: { id: item.variantId },
      });
      if (!variant.allowBackorder && variant.stock < item.quantity) {
        throw new Error(`Insufficient stock for variant ${variant.id}.`);
      }
      const committed = await commitVariantStockAtomically(
        tx,
        item.variantId,
        item.quantity,
      );
      if (!committed) {
        throw new Error(`Insufficient stock for variant ${variant.id}.`);
      }
      await tx.inventoryLog.create({
        data: {
          variantId: item.variantId,
          oldStock: variant.stock,
          newStock: variant.stock - item.quantity,
          delta: -item.quantity,
          reason: "ORDER_COMPLETED",
          note: `Order ${order.orderNumber}`,
          actor: "Checkout",
        },
      });
    }

    await tx.cart.update({
      where: { id: order.cart.id },
      data: { status: CartStatus.COMPLETED, completedAt: new Date() },
    });
    await tx.order.update({
      where: { id: order.id },
      data: {
        status: "PAID",
        paymentStatus: "paid",
        payment: order.payment
          ? { update: { status: "paid", providerRef } }
          : {
              create: {
                provider: "stripe",
                providerRef,
                status: "paid",
                amount: order.total,
              },
            },
      },
    });
    await finalizeGiftCardRedemptionsTx(tx, order.id, "Checkout");

    return order;
  });
}

export async function completeCashOnDeliveryOrder(orderId: string) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { cart: { include: { items: true } }, payment: true },
    });
    if (!order) throw new Error("Order not found.");
    if (!order.cart || order.cart.status === CartStatus.COMPLETED) return order;

    for (const item of order.cart.items) {
      const variant = await tx.productVariant.findUniqueOrThrow({
        where: { id: item.variantId },
      });
      if (!variant.allowBackorder && variant.stock < item.quantity) {
        throw new Error(`Insufficient stock for variant ${variant.id}.`);
      }
      const committed = await commitVariantStockAtomically(
        tx,
        item.variantId,
        item.quantity,
      );
      if (!committed) {
        throw new Error(`Insufficient stock for variant ${variant.id}.`);
      }
      await tx.inventoryLog.create({
        data: {
          variantId: item.variantId,
          oldStock: variant.stock,
          newStock: variant.stock - item.quantity,
          delta: -item.quantity,
          reason: "ORDER_COMPLETED",
          note: `COD order ${order.orderNumber}`,
          actor: "Checkout",
        },
      });
    }

    await tx.cart.update({
      where: { id: order.cart.id },
      data: { status: CartStatus.COMPLETED, completedAt: new Date() },
    });
    await tx.order.update({
      where: { id: order.id },
      data: {
        status: "PROCESSING",
        paymentStatus: "cod_pending",
        payment: order.payment
          ? {
              update: {
                provider: "cash_on_delivery",
                providerRef: null,
                status: "cod_pending",
              },
            }
          : {
              create: {
                provider: "cash_on_delivery",
                status: "cod_pending",
                amount: order.total,
              },
            },
      },
    });
    await finalizeGiftCardRedemptionsTx(tx, order.id, "Checkout");

    return order;
  });
}
