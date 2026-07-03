-- AlterTable
ALTER TABLE "ReturnIntegrationAttempt" ADD COLUMN "providerEventId" TEXT;

-- CreateIndex
CREATE INDEX "ReturnIntegrationAttempt_providerEventId_idx" ON "ReturnIntegrationAttempt"("providerEventId");
