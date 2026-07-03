-- AlterTable
ALTER TABLE "EmailDelivery" ADD COLUMN "clickedAt" DATETIME;
ALTER TABLE "EmailDelivery" ADD COLUMN "conversionOrderId" TEXT;
ALTER TABLE "EmailDelivery" ADD COLUMN "conversionValue" DECIMAL;
ALTER TABLE "EmailDelivery" ADD COLUMN "convertedAt" DATETIME;

-- CreateIndex
CREATE INDEX "EmailDelivery_eventType_sentAt_idx" ON "EmailDelivery"("eventType", "sentAt");

-- CreateIndex
CREATE INDEX "EmailDelivery_clickedAt_convertedAt_idx" ON "EmailDelivery"("clickedAt", "convertedAt");
