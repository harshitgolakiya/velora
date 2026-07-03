ALTER TABLE "Product" ADD COLUMN "fitSummary" TEXT;
ALTER TABLE "Product" ADD COLUMN "modelReference" TEXT;
ALTER TABLE "Product" ADD COLUMN "sizeAdvice" TEXT;
ALTER TABLE "Product" ADD COLUMN "dimensionNotes" TEXT NOT NULL DEFAULT '[]';

ALTER TABLE "ProductTranslation" ADD COLUMN "fitSummary" TEXT;
ALTER TABLE "ProductTranslation" ADD COLUMN "modelReference" TEXT;
ALTER TABLE "ProductTranslation" ADD COLUMN "sizeAdvice" TEXT;
ALTER TABLE "ProductTranslation" ADD COLUMN "dimensionNotes" TEXT;
