-- CreateTable
CREATE TABLE "SearchClickEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "query" TEXT NOT NULL,
    "normalizedQuery" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'storefront',
    "resultType" TEXT NOT NULL,
    "resultId" TEXT,
    "href" TEXT NOT NULL,
    "position" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "SearchClickEvent_normalizedQuery_createdAt_idx" ON "SearchClickEvent"("normalizedQuery", "createdAt");

-- CreateIndex
CREATE INDEX "SearchClickEvent_resultType_createdAt_idx" ON "SearchClickEvent"("resultType", "createdAt");
