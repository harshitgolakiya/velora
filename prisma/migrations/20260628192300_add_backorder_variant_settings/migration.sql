ALTER TABLE "ProductVariant" ADD COLUMN "backorderLimit" INTEGER;
ALTER TABLE "ProductVariant" ADD COLUMN "backorderShipsAt" DATETIME;
ALTER TABLE "ProductVariant" ADD COLUMN "backorderMessage" TEXT;
