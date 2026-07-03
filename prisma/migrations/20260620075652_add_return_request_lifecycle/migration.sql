-- AlterTable
ALTER TABLE "ReturnRequest" ADD COLUMN "adminNote" TEXT;
ALTER TABLE "ReturnRequest" ADD COLUMN "completedAt" DATETIME;
ALTER TABLE "ReturnRequest" ADD COLUMN "decisionAt" DATETIME;

-- CreateTable
CREATE TABLE "ReturnRequestEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "message" TEXT,
    "actor" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReturnRequestEvent_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ReturnRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ReturnRequestEvent_requestId_createdAt_idx" ON "ReturnRequestEvent"("requestId", "createdAt");
