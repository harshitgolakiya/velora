ALTER TABLE "Order" ADD COLUMN "giftCardTotal" DECIMAL NOT NULL DEFAULT 0;

CREATE TABLE "GiftCard" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "codeHash" TEXT NOT NULL,
  "codeLast4" TEXT NOT NULL,
  "initialBalance" DECIMAL NOT NULL,
  "balance" DECIMAL NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'AED',
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "recipientEmail" TEXT,
  "purchaserEmail" TEXT,
  "note" TEXT,
  "expiresAt" DATETIME,
  "issuedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "GiftCardLedgerEntry" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "giftCardId" TEXT NOT NULL,
  "orderId" TEXT,
  "type" TEXT NOT NULL,
  "amount" DECIMAL NOT NULL,
  "balanceAfter" DECIMAL NOT NULL,
  "actor" TEXT NOT NULL,
  "note" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GiftCardLedgerEntry_giftCardId_fkey" FOREIGN KEY ("giftCardId") REFERENCES "GiftCard" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "GiftCardLedgerEntry_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "GiftCard_codeHash_key" ON "GiftCard"("codeHash");
CREATE INDEX "GiftCard_status_expiresAt_idx" ON "GiftCard"("status", "expiresAt");
CREATE INDEX "GiftCard_recipientEmail_idx" ON "GiftCard"("recipientEmail");
CREATE INDEX "GiftCardLedgerEntry_giftCardId_createdAt_idx" ON "GiftCardLedgerEntry"("giftCardId", "createdAt");
CREATE INDEX "GiftCardLedgerEntry_orderId_createdAt_idx" ON "GiftCardLedgerEntry"("orderId", "createdAt");
CREATE INDEX "GiftCardLedgerEntry_type_createdAt_idx" ON "GiftCardLedgerEntry"("type", "createdAt");
