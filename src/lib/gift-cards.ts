import "server-only";

import { createHash, randomBytes } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

type Tx = Prisma.TransactionClient;

export function normalizeGiftCardCode(code: string) {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function hashGiftCardCode(code: string) {
  return createHash("sha256").update(normalizeGiftCardCode(code)).digest("hex");
}

function generateGiftCardCode() {
  const raw = randomBytes(9).toString("hex").toUpperCase();
  return `VLGC-${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}`;
}

function codeLast4(code: string) {
  return normalizeGiftCardCode(code).slice(-4);
}

function isExpired(expiresAt?: Date | null) {
  return Boolean(expiresAt && expiresAt.getTime() <= Date.now());
}

export async function createGiftCard(input: {
  amount: number;
  recipientEmail?: string | null;
  purchaserEmail?: string | null;
  note?: string | null;
  expiresAt?: Date | null;
  actor: string;
}) {
  if (input.amount <= 0) throw new Error("Gift card amount must be greater than zero.");

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateGiftCardCode();
    try {
      const giftCard = await prisma.$transaction(async (tx) => {
        const created = await tx.giftCard.create({
          data: {
            codeHash: hashGiftCardCode(code),
            codeLast4: codeLast4(code),
            initialBalance: input.amount,
            balance: input.amount,
            recipientEmail: input.recipientEmail || null,
            purchaserEmail: input.purchaserEmail || null,
            note: input.note || null,
            expiresAt: input.expiresAt ?? null,
          },
        });
        await tx.giftCardLedgerEntry.create({
          data: {
            giftCardId: created.id,
            type: "ISSUED",
            amount: input.amount,
            balanceAfter: input.amount,
            actor: input.actor,
            note: "Gift card issued",
          },
        });
        return created;
      });
      return { giftCard, code };
    } catch (error) {
      if (attempt === 4) throw error;
    }
  }
  throw new Error("Unable to generate a unique gift-card code.");
}

export async function getGiftCardQuote(code: string, payableAmount: number) {
  const giftCard = await prisma.giftCard.findUnique({
    where: { codeHash: hashGiftCardCode(code) },
  });
  if (!giftCard || giftCard.status !== "ACTIVE" || isExpired(giftCard.expiresAt)) {
    return { valid: false as const, reason: "Gift card is invalid or expired." };
  }
  const balance = Number(giftCard.balance);
  if (balance <= 0) return { valid: false as const, reason: "Gift card has no remaining balance." };
  const appliedAmount = Math.min(balance, Math.max(0, payableAmount));
  return {
    valid: true as const,
    giftCardId: giftCard.id,
    codeLast4: giftCard.codeLast4,
    balance,
    appliedAmount,
    expiresAt: giftCard.expiresAt?.toISOString(),
  };
}

export async function holdGiftCardForOrder(input: {
  tx: Tx;
  code: string;
  orderId: string;
  amount: number;
  actor: string;
}) {
  if (input.amount <= 0) return null;
  const codeHash = hashGiftCardCode(input.code);
  const giftCard = await input.tx.giftCard.findUnique({
    where: { codeHash },
    include: { ledgerEntries: { where: { orderId: input.orderId, type: { in: ["HELD", "REDEEMED"] } } } },
  });
  if (!giftCard || giftCard.status !== "ACTIVE" || isExpired(giftCard.expiresAt)) {
    throw new Error("Gift card is invalid or expired.");
  }
  const existing = giftCard.ledgerEntries[0];
  if (existing) return { giftCardId: giftCard.id, amount: Math.abs(Number(existing.amount)) };

  const balance = Number(giftCard.balance);
  const amount = Math.min(balance, input.amount);
  if (amount <= 0) throw new Error("Gift card has no remaining balance.");
  const balanceAfter = balance - amount;
  await input.tx.giftCard.update({
    where: { id: giftCard.id },
    data: { balance: balanceAfter, status: balanceAfter <= 0 ? "SPENT" : giftCard.status },
  });
  await input.tx.giftCardLedgerEntry.create({
    data: {
      giftCardId: giftCard.id,
      orderId: input.orderId,
      type: "HELD",
      amount: -amount,
      balanceAfter,
      actor: input.actor,
      note: "Checkout hold",
    },
  });
  return { giftCardId: giftCard.id, amount };
}

export async function finalizeGiftCardRedemptionsTx(tx: Tx, orderId: string, actor: string) {
  await tx.giftCardLedgerEntry.updateMany({
    where: { orderId, type: "HELD" },
    data: { type: "REDEEMED", actor, note: "Redeemed at order completion" },
  });
}

export async function releaseGiftCardHoldsTx(tx: Tx, orderId: string, actor: string) {
  const holds = await tx.giftCardLedgerEntry.findMany({
    where: { orderId, type: "HELD" },
  });
  for (const hold of holds) {
    const amount = Math.abs(Number(hold.amount));
    const giftCard = await tx.giftCard.findUniqueOrThrow({ where: { id: hold.giftCardId } });
    const balanceAfter = Number(giftCard.balance) + amount;
    await tx.giftCard.update({
      where: { id: giftCard.id },
      data: { balance: balanceAfter, status: giftCard.status === "SPENT" ? "ACTIVE" : giftCard.status },
    });
    await tx.giftCardLedgerEntry.update({
      where: { id: hold.id },
      data: {
        type: "RELEASED",
        amount,
        balanceAfter,
        actor,
        note: "Checkout hold released",
      },
    });
  }
}

export async function refundGiftCardsForOrderTx(tx: Tx, input: {
  orderId: string;
  amount: number;
  actor: string;
  note?: string;
}) {
  let remaining = Math.max(0, input.amount);
  if (remaining <= 0) return 0;

  const redeemed = await tx.giftCardLedgerEntry.findMany({
    where: { orderId: input.orderId, type: "REDEEMED" },
    orderBy: { createdAt: "asc" },
  });
  let refundedTotal = 0;
  for (const redemption of redeemed) {
    if (remaining <= 0) break;
    const alreadyRefunded = await tx.giftCardLedgerEntry.aggregate({
      where: {
        orderId: input.orderId,
        giftCardId: redemption.giftCardId,
        type: "REFUNDED",
      },
      _sum: { amount: true },
    });
    const redeemedAmount = Math.abs(Number(redemption.amount));
    const refundable = Math.max(0, redeemedAmount - Number(alreadyRefunded._sum.amount ?? 0));
    const amount = Math.min(refundable, remaining);
    if (amount <= 0) continue;
    const giftCard = await tx.giftCard.findUniqueOrThrow({ where: { id: redemption.giftCardId } });
    const balanceAfter = Number(giftCard.balance) + amount;
    await tx.giftCard.update({
      where: { id: giftCard.id },
      data: { balance: balanceAfter, status: giftCard.status === "SPENT" ? "ACTIVE" : giftCard.status },
    });
    await tx.giftCardLedgerEntry.create({
      data: {
        giftCardId: giftCard.id,
        orderId: input.orderId,
        type: "REFUNDED",
        amount,
        balanceAfter,
        actor: input.actor,
        note: input.note ?? "Refunded to original gift card",
      },
    });
    refundedTotal += amount;
    remaining -= amount;
  }
  return refundedTotal;
}
