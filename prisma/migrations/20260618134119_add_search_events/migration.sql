-- CreateTable
CREATE TABLE "SearchEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "query" TEXT NOT NULL,
    "normalizedQuery" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'storefront',
    "productCount" INTEGER NOT NULL DEFAULT 0,
    "categoryCount" INTEGER NOT NULL DEFAULT 0,
    "collectionCount" INTEGER NOT NULL DEFAULT 0,
    "pageCount" INTEGER NOT NULL DEFAULT 0,
    "zeroResults" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "SearchEvent_normalizedQuery_createdAt_idx" ON "SearchEvent"("normalizedQuery", "createdAt");

-- CreateIndex
CREATE INDEX "SearchEvent_zeroResults_createdAt_idx" ON "SearchEvent"("zeroResults", "createdAt");
