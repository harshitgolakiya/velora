-- CreateTable
CREATE TABLE "ProductAlertSubscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "userId" TEXT,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "targetPrice" DECIMAL,
    "source" TEXT NOT NULL DEFAULT 'product_page',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProductAlertSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ProductAlertSubscription_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProductAlertSubscription_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ProductAlertSubscription_type_status_createdAt_idx" ON "ProductAlertSubscription"("type", "status", "createdAt");

-- CreateIndex
CREATE INDEX "ProductAlertSubscription_productId_type_idx" ON "ProductAlertSubscription"("productId", "type");

-- CreateIndex
CREATE INDEX "ProductAlertSubscription_variantId_type_idx" ON "ProductAlertSubscription"("variantId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "ProductAlertSubscription_email_type_productId_variantId_key" ON "ProductAlertSubscription"("email", "type", "productId", "variantId");
