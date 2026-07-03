-- CreateTable
CREATE TABLE "StorefrontFilterEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "path" TEXT NOT NULL,
    "filterKey" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resultCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "StorefrontFilterEvent_filterKey_createdAt_idx" ON "StorefrontFilterEvent"("filterKey", "createdAt");

-- CreateIndex
CREATE INDEX "StorefrontFilterEvent_path_createdAt_idx" ON "StorefrontFilterEvent"("path", "createdAt");
