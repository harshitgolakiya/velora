CREATE TABLE "PaymentProviderEvent" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "provider" TEXT NOT NULL,
  "providerEventId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "orderId" TEXT,
  "orderNumber" TEXT,
  "paymentRef" TEXT,
  "severity" TEXT NOT NULL DEFAULT 'INFO',
  "status" TEXT NOT NULL DEFAULT 'RECEIVED',
  "message" TEXT,
  "payload" TEXT,
  "occurredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "PaymentProviderEvent_provider_providerEventId_key" ON "PaymentProviderEvent"("provider", "providerEventId");
CREATE INDEX "PaymentProviderEvent_eventType_occurredAt_idx" ON "PaymentProviderEvent"("eventType", "occurredAt");
CREATE INDEX "PaymentProviderEvent_status_occurredAt_idx" ON "PaymentProviderEvent"("status", "occurredAt");
CREATE INDEX "PaymentProviderEvent_orderId_occurredAt_idx" ON "PaymentProviderEvent"("orderId", "occurredAt");
