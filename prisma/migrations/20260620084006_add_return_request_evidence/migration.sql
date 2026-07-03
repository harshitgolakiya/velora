-- CreateTable
CREATE TABLE "ReturnRequestEvidence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReturnRequestEvidence_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ReturnRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ReturnRequestEvidence_storageKey_key" ON "ReturnRequestEvidence"("storageKey");

-- CreateIndex
CREATE INDEX "ReturnRequestEvidence_requestId_createdAt_idx" ON "ReturnRequestEvidence"("requestId", "createdAt");
