-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_MediaAsset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "mediaType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "aspectRatio" REAL,
    "optimizedFormat" TEXT,
    "responsiveWidths" TEXT NOT NULL DEFAULT '[]',
    "optimizationNotes" TEXT,
    "altText" TEXT,
    "folder" TEXT,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "uploadedBy" TEXT NOT NULL DEFAULT 'Super admin',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_MediaAsset" ("altText", "createdAt", "folder", "height", "id", "mediaType", "mimeType", "name", "originalName", "sizeBytes", "tags", "updatedAt", "uploadedBy", "url", "width") SELECT "altText", "createdAt", "folder", "height", "id", "mediaType", "mimeType", "name", "originalName", "sizeBytes", "tags", "updatedAt", "uploadedBy", "url", "width" FROM "MediaAsset";
DROP TABLE "MediaAsset";
ALTER TABLE "new_MediaAsset" RENAME TO "MediaAsset";
CREATE UNIQUE INDEX "MediaAsset_url_key" ON "MediaAsset"("url");
CREATE INDEX "MediaAsset_createdAt_idx" ON "MediaAsset"("createdAt");
CREATE INDEX "MediaAsset_mediaType_idx" ON "MediaAsset"("mediaType");
CREATE INDEX "MediaAsset_folder_idx" ON "MediaAsset"("folder");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
