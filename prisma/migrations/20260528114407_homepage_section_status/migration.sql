-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_HomepageSection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'CUSTOM',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "body" TEXT,
    "ctaLabel" TEXT,
    "ctaHref" TEXT,
    "imageUrl" TEXT,
    "mobileImageUrl" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "settings" TEXT NOT NULL DEFAULT '{}',
    "publishedAt" DATETIME,
    "collectionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "HomepageSection_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_HomepageSection" ("body", "collectionId", "createdAt", "ctaHref", "ctaLabel", "enabled", "id", "imageUrl", "key", "mobileImageUrl", "publishedAt", "settings", "sortOrder", "subtitle", "title", "type", "updatedAt") SELECT "body", "collectionId", "createdAt", "ctaHref", "ctaLabel", "enabled", "id", "imageUrl", "key", "mobileImageUrl", "publishedAt", "settings", "sortOrder", "subtitle", "title", "type", "updatedAt" FROM "HomepageSection";
DROP TABLE "HomepageSection";
ALTER TABLE "new_HomepageSection" RENAME TO "HomepageSection";
CREATE UNIQUE INDEX "HomepageSection_key_key" ON "HomepageSection"("key");
CREATE INDEX "HomepageSection_enabled_sortOrder_idx" ON "HomepageSection"("enabled", "sortOrder");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
