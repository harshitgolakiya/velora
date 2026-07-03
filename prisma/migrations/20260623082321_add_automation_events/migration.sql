-- CreateTable
CREATE TABLE "AutomationEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "sourceKey" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "orderId" TEXT,
    "cartId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "scheduledAt" DATETIME NOT NULL,
    "processedAt" DATETIME,
    "skippedAt" DATETIME,
    "error" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "AutomationEvent_sourceKey_key" ON "AutomationEvent"("sourceKey");

-- CreateIndex
CREATE INDEX "AutomationEvent_status_scheduledAt_idx" ON "AutomationEvent"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "AutomationEvent_type_createdAt_idx" ON "AutomationEvent"("type", "createdAt");
