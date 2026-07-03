-- AlterTable
ALTER TABLE "ProductAlertSubscription" ADD COLUMN "lastNotifiedAt" DATETIME;

-- CreateTable
CREATE TABLE "ProductAlertDelivery" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "subscriptionId" TEXT NOT NULL,
    "eventKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "triggerValue" DECIMAL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "nextAttemptAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "suppressionReason" TEXT,
    "emailDeliveryId" TEXT,
    "error" TEXT,
    "sentAt" DATETIME,
    "clickedAt" DATETIME,
    "convertedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProductAlertDelivery_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "ProductAlertSubscription" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductAlertDelivery_eventKey_key" ON "ProductAlertDelivery"("eventKey");

-- CreateIndex
CREATE INDEX "ProductAlertDelivery_status_nextAttemptAt_idx" ON "ProductAlertDelivery"("status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "ProductAlertDelivery_subscriptionId_createdAt_idx" ON "ProductAlertDelivery"("subscriptionId", "createdAt");

-- CreateIndex
CREATE INDEX "ProductAlertDelivery_clickedAt_convertedAt_idx" ON "ProductAlertDelivery"("clickedAt", "convertedAt");
