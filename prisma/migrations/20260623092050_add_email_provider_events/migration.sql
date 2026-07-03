-- AlterTable
ALTER TABLE "EmailDelivery" ADD COLUMN "failureAlertedAt" DATETIME;

-- CreateTable
CREATE TABLE "EmailProviderEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "provider" TEXT NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "deliveryId" TEXT,
    "sourceKey" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'INFO',
    "alertStatus" TEXT NOT NULL DEFAULT 'NONE',
    "message" TEXT,
    "payload" TEXT,
    "occurredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "EmailProviderEvent_eventType_occurredAt_idx" ON "EmailProviderEvent"("eventType", "occurredAt");

-- CreateIndex
CREATE INDEX "EmailProviderEvent_alertStatus_occurredAt_idx" ON "EmailProviderEvent"("alertStatus", "occurredAt");

-- CreateIndex
CREATE INDEX "EmailProviderEvent_recipient_occurredAt_idx" ON "EmailProviderEvent"("recipient", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "EmailProviderEvent_provider_providerEventId_key" ON "EmailProviderEvent"("provider", "providerEventId");
