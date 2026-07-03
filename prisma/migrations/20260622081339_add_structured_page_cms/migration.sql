-- CreateTable
CREATE TABLE "PageContentVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pageId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "body" TEXT NOT NULL,
    "blocks" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PageContentVersion_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "PageContent" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PageContent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "body" TEXT NOT NULL,
    "blocks" TEXT NOT NULL DEFAULT '[]',
    "contentType" TEXT NOT NULL DEFAULT 'EDITORIAL',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "locale" TEXT NOT NULL DEFAULT 'en',
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "scheduledAt" DATETIME,
    "publishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_PageContent" ("body", "id", "locale", "slug", "title", "updatedAt") SELECT "body", "id", "locale", "slug", "title", "updatedAt" FROM "PageContent";
DROP TABLE "PageContent";
ALTER TABLE "new_PageContent" RENAME TO "PageContent";
CREATE UNIQUE INDEX "PageContent_slug_key" ON "PageContent"("slug");
CREATE INDEX "PageContent_status_scheduledAt_idx" ON "PageContent"("status", "scheduledAt");
CREATE INDEX "PageContent_contentType_status_idx" ON "PageContent"("contentType", "status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "PageContentVersion_pageId_createdAt_idx" ON "PageContentVersion"("pageId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PageContentVersion_pageId_version_key" ON "PageContentVersion"("pageId", "version");
