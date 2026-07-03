-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ReturnRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "replacementOrderId" TEXT,
    "resolution" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "notes" TEXT NOT NULL,
    "adminNote" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "integrationStatus" TEXT NOT NULL DEFAULT 'NOT_SENT',
    "externalReference" TEXT,
    "decisionAt" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ReturnRequest_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReturnRequest_replacementOrderId_fkey" FOREIGN KEY ("replacementOrderId") REFERENCES "Order" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ReturnRequest" ("adminNote", "completedAt", "createdAt", "decisionAt", "externalReference", "id", "integrationStatus", "notes", "orderId", "reason", "resolution", "status", "updatedAt") SELECT "adminNote", "completedAt", "createdAt", "decisionAt", "externalReference", "id", "integrationStatus", "notes", "orderId", "reason", "resolution", "status", "updatedAt" FROM "ReturnRequest";
DROP TABLE "ReturnRequest";
ALTER TABLE "new_ReturnRequest" RENAME TO "ReturnRequest";
CREATE UNIQUE INDEX "ReturnRequest_replacementOrderId_key" ON "ReturnRequest"("replacementOrderId");
CREATE INDEX "ReturnRequest_orderId_createdAt_idx" ON "ReturnRequest"("orderId", "createdAt");
CREATE INDEX "ReturnRequest_status_createdAt_idx" ON "ReturnRequest"("status", "createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
