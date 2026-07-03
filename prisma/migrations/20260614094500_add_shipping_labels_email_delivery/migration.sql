-- AlterTable
ALTER TABLE "Shipment" ADD COLUMN "labelCreatedAt" DATETIME;
ALTER TABLE "Shipment" ADD COLUMN "labelFormat" TEXT;
ALTER TABLE "Shipment" ADD COLUMN "labelId" TEXT;
ALTER TABLE "Shipment" ADD COLUMN "weightGrams" INTEGER;

-- CreateTable
CREATE TABLE "EmailDelivery" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workflowId" TEXT,
    "orderId" TEXT,
    "sourceKey" TEXT,
    "recipient" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerRef" TEXT,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "metadata" TEXT,
    "sentAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmailDelivery_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "AutomationWorkflow" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "EmailDelivery_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailDelivery_sourceKey_key" ON "EmailDelivery"("sourceKey");

-- CreateIndex
CREATE INDEX "EmailDelivery_status_createdAt_idx" ON "EmailDelivery"("status", "createdAt");

-- CreateIndex
CREATE INDEX "EmailDelivery_workflowId_createdAt_idx" ON "EmailDelivery"("workflowId", "createdAt");

-- CreateIndex
CREATE INDEX "EmailDelivery_orderId_createdAt_idx" ON "EmailDelivery"("orderId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Shipment_labelId_key" ON "Shipment"("labelId");
