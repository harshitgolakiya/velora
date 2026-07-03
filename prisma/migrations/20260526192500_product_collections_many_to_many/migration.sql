PRAGMA foreign_keys=OFF;

-- Create the implicit many-to-many join table used by Prisma for
-- Collection.products <-> Product.collections.
CREATE TABLE "_CollectionToProduct" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_CollectionToProduct_A_fkey" FOREIGN KEY ("A") REFERENCES "Collection" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_CollectionToProduct_B_fkey" FOREIGN KEY ("B") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Preserve existing single-collection assignments as many-to-many rows.
INSERT INTO "_CollectionToProduct" ("A", "B")
SELECT "collectionId", "id"
FROM "Product"
WHERE "collectionId" IS NOT NULL;

CREATE UNIQUE INDEX "_CollectionToProduct_AB_unique" ON "_CollectionToProduct"("A", "B");
CREATE INDEX "_CollectionToProduct_B_index" ON "_CollectionToProduct"("B");

-- SQLite cannot safely drop a foreign-key column in place across all supported
-- versions, so redefine Product without collectionId.
CREATE TABLE "new_Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" DECIMAL NOT NULL,
    "salePrice" DECIMAL,
    "sku" TEXT NOT NULL,
    "fabricDetails" TEXT NOT NULL,
    "careInstructions" TEXT NOT NULL,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "bestSeller" BOOLEAN NOT NULL DEFAULT false,
    "newArrival" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "categoryId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "new_Product" (
    "id",
    "title",
    "slug",
    "description",
    "price",
    "salePrice",
    "sku",
    "fabricDetails",
    "careInstructions",
    "seoTitle",
    "seoDescription",
    "featured",
    "bestSeller",
    "newArrival",
    "status",
    "categoryId",
    "createdAt",
    "updatedAt"
)
SELECT
    "id",
    "title",
    "slug",
    "description",
    "price",
    "salePrice",
    "sku",
    "fabricDetails",
    "careInstructions",
    "seoTitle",
    "seoDescription",
    "featured",
    "bestSeller",
    "newArrival",
    "status",
    "categoryId",
    "createdAt",
    "updatedAt"
FROM "Product";

DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";

CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");

PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
