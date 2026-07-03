-- CreateTable
CREATE TABLE "PrivacyRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requestedBy" TEXT NOT NULL DEFAULT 'customer',
    "legalHold" BOOLEAN NOT NULL DEFAULT false,
    "retentionUntil" DATETIME,
    "completedAt" DATETIME,
    "rejectedAt" DATETIME,
    "notes" TEXT,
    "auditLog" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PrivacyRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "PrivacyRequest_status_createdAt_idx" ON "PrivacyRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "PrivacyRequest_email_createdAt_idx" ON "PrivacyRequest"("email", "createdAt");

-- CreateIndex
CREATE INDEX "PrivacyRequest_userId_createdAt_idx" ON "PrivacyRequest"("userId", "createdAt");
