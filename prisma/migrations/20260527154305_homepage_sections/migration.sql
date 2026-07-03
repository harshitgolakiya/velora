-- CreateTable
CREATE TABLE "HomepageSection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'CUSTOM',
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

-- CreateTable
CREATE TABLE "_HomepageSectionToProduct" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_HomepageSectionToProduct_A_fkey" FOREIGN KEY ("A") REFERENCES "HomepageSection" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_HomepageSectionToProduct_B_fkey" FOREIGN KEY ("B") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "HomepageSection_key_key" ON "HomepageSection"("key");

-- CreateIndex
CREATE INDEX "HomepageSection_enabled_sortOrder_idx" ON "HomepageSection"("enabled", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "_HomepageSectionToProduct_AB_unique" ON "_HomepageSectionToProduct"("A", "B");

-- CreateIndex
CREATE INDEX "_HomepageSectionToProduct_B_index" ON "_HomepageSectionToProduct"("B");
