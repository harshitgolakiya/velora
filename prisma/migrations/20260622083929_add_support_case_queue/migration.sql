-- CreateTable
CREATE TABLE "SupportCase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseNumber" TEXT NOT NULL,
    "userId" TEXT,
    "orderId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "assignedTo" TEXT,
    "adminNote" TEXT,
    "source" TEXT NOT NULL DEFAULT 'contact_page',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SupportCase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SupportCase_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "SupportCase_caseNumber_key" ON "SupportCase"("caseNumber");

-- CreateIndex
CREATE INDEX "SupportCase_status_priority_createdAt_idx" ON "SupportCase"("status", "priority", "createdAt");

-- CreateIndex
CREATE INDEX "SupportCase_email_createdAt_idx" ON "SupportCase"("email", "createdAt");

-- CreateIndex
CREATE INDEX "SupportCase_orderId_createdAt_idx" ON "SupportCase"("orderId", "createdAt");
