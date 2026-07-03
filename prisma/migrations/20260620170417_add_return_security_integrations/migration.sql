-- CreateTable
CREATE TABLE "ReturnIntegrationAttempt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "requestPayload" TEXT,
    "responsePayload" TEXT,
    "errorMessage" TEXT,
    "externalRef" TEXT,
    "nextRetryAt" DATETIME,
    "lastAttemptAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ReturnIntegrationAttempt_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ReturnRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ReturnRequestEvidence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "scanStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "scanProvider" TEXT,
    "scanReference" TEXT,
    "scanThreat" TEXT,
    "scannedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReturnRequestEvidence_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ReturnRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ReturnRequestEvidence" ("createdAt", "id", "mimeType", "originalName", "requestId", "sizeBytes", "storageKey", "uploadedBy") SELECT "createdAt", "id", "mimeType", "originalName", "requestId", "sizeBytes", "storageKey", "uploadedBy" FROM "ReturnRequestEvidence";
DROP TABLE "ReturnRequestEvidence";
ALTER TABLE "new_ReturnRequestEvidence" RENAME TO "ReturnRequestEvidence";
CREATE UNIQUE INDEX "ReturnRequestEvidence_storageKey_key" ON "ReturnRequestEvidence"("storageKey");
CREATE INDEX "ReturnRequestEvidence_requestId_createdAt_idx" ON "ReturnRequestEvidence"("requestId", "createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "ReturnIntegrationAttempt_requestId_createdAt_idx" ON "ReturnIntegrationAttempt"("requestId", "createdAt");

-- CreateIndex
CREATE INDEX "ReturnIntegrationAttempt_status_nextRetryAt_idx" ON "ReturnIntegrationAttempt"("status", "nextRetryAt");
