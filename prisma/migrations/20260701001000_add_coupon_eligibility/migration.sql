ALTER TABLE "Coupon" ADD COLUMN "combinable" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Coupon" ADD COLUMN "eligibleProductIds" TEXT;
ALTER TABLE "Coupon" ADD COLUMN "eligibleCategories" TEXT;
ALTER TABLE "Coupon" ADD COLUMN "eligibleCollections" TEXT;
ALTER TABLE "Coupon" ADD COLUMN "excludedProductIds" TEXT;
