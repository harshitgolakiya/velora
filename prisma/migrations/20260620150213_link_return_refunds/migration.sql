/*
  Warnings:

  - Added the required column `updatedAt` to the `RefundRecord` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_RefundRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "returnRequestId" TEXT,
    "amount" DECIMAL NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "provider" TEXT NOT NULL DEFAULT 'manual',
    "providerRef" TEXT,
    "note" TEXT,
    "actor" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RefundRecord_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RefundRecord_returnRequestId_fkey" FOREIGN KEY ("returnRequestId") REFERENCES "ReturnRequest" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_RefundRecord" ("actor", "amount", "createdAt", "id", "kind", "note", "orderId", "status") SELECT "actor", "amount", "createdAt", "id", "kind", "note", "orderId", "status" FROM "RefundRecord";
DROP TABLE "RefundRecord";
ALTER TABLE "new_RefundRecord" RENAME TO "RefundRecord";
CREATE UNIQUE INDEX "RefundRecord_returnRequestId_key" ON "RefundRecord"("returnRequestId");
CREATE UNIQUE INDEX "RefundRecord_providerRef_key" ON "RefundRecord"("providerRef");
CREATE INDEX "RefundRecord_orderId_createdAt_idx" ON "RefundRecord"("orderId", "createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
