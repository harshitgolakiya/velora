-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_EmailDelivery" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workflowId" TEXT,
    "orderId" TEXT,
    "sourceKey" TEXT,
    "recipient" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "bodyHtml" TEXT,
    "provider" TEXT NOT NULL,
    "providerRef" TEXT,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "eventType" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "scheduledAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nextAttemptAt" DATETIME,
    "processingAt" DATETIME,
    "lastAttemptAt" DATETIME,
    "suppressionReason" TEXT,
    "metadata" TEXT,
    "sentAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmailDelivery_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "AutomationWorkflow" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "EmailDelivery_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_EmailDelivery" ("createdAt", "error", "id", "metadata", "orderId", "provider", "providerRef", "recipient", "sentAt", "sourceKey", "status", "subject", "workflowId") SELECT "createdAt", "error", "id", "metadata", "orderId", "provider", "providerRef", "recipient", "sentAt", "sourceKey", "status", "subject", "workflowId" FROM "EmailDelivery";
DROP TABLE "EmailDelivery";
ALTER TABLE "new_EmailDelivery" RENAME TO "EmailDelivery";
CREATE UNIQUE INDEX "EmailDelivery_sourceKey_key" ON "EmailDelivery"("sourceKey");
CREATE INDEX "EmailDelivery_status_createdAt_idx" ON "EmailDelivery"("status", "createdAt");
CREATE INDEX "EmailDelivery_status_nextAttemptAt_idx" ON "EmailDelivery"("status", "nextAttemptAt");
CREATE INDEX "EmailDelivery_workflowId_createdAt_idx" ON "EmailDelivery"("workflowId", "createdAt");
CREATE INDEX "EmailDelivery_orderId_createdAt_idx" ON "EmailDelivery"("orderId", "createdAt");
CREATE TABLE "new_NewsletterSubscriber" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "source" TEXT NOT NULL DEFAULT 'storefront',
    "status" TEXT NOT NULL DEFAULT 'SUBSCRIBED',
    "preferences" TEXT NOT NULL DEFAULT '{"editorial":true,"product":true,"offers":true}',
    "consentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "consentSource" TEXT NOT NULL DEFAULT 'storefront',
    "subscribedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unsubscribedAt" DATETIME,
    "suppressionReason" TEXT,
    "lastSyncAt" DATETIME,
    "lastSyncStatus" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_NewsletterSubscriber" ("createdAt", "email", "id", "locale", "source", "status", "subscribedAt", "updatedAt") SELECT "createdAt", "email", "id", "locale", "source", "status", "subscribedAt", "updatedAt" FROM "NewsletterSubscriber";
DROP TABLE "NewsletterSubscriber";
ALTER TABLE "new_NewsletterSubscriber" RENAME TO "NewsletterSubscriber";
CREATE UNIQUE INDEX "NewsletterSubscriber_email_key" ON "NewsletterSubscriber"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
