-- CreateTable
CREATE TABLE "RecommendationEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceProductId" TEXT NOT NULL,
    "recommendedProductId" TEXT NOT NULL,
    "strategy" TEXT NOT NULL DEFAULT 'RELATED_SCORE',
    "eventType" TEXT NOT NULL,
    "placement" TEXT NOT NULL DEFAULT 'product_page',
    "sessionKey" TEXT,
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RecommendationEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "RecommendationEvent_sourceProductId_eventType_createdAt_idx" ON "RecommendationEvent"("sourceProductId", "eventType", "createdAt");

-- CreateIndex
CREATE INDEX "RecommendationEvent_recommendedProductId_eventType_createdAt_idx" ON "RecommendationEvent"("recommendedProductId", "eventType", "createdAt");

-- CreateIndex
CREATE INDEX "RecommendationEvent_sessionKey_createdAt_idx" ON "RecommendationEvent"("sessionKey", "createdAt");
