-- CreateTable
CREATE TABLE "ReturnInspection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT NOT NULL,
    "condition" TEXT NOT NULL,
    "disposition" TEXT NOT NULL,
    "notes" TEXT,
    "inspectedBy" TEXT NOT NULL,
    "inspectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ReturnInspection_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ReturnRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ReturnInspection_requestId_key" ON "ReturnInspection"("requestId");
