-- CreateTable
CREATE TABLE "ReturnShipment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "carrier" TEXT,
    "trackingNo" TEXT,
    "pickupStart" DATETIME,
    "pickupEnd" DATETIME,
    "labelId" TEXT,
    "labelFormat" TEXT,
    "labelCreatedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ReturnShipment_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ReturnRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ReturnShipment_requestId_key" ON "ReturnShipment"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "ReturnShipment_trackingNo_key" ON "ReturnShipment"("trackingNo");

-- CreateIndex
CREATE UNIQUE INDEX "ReturnShipment_labelId_key" ON "ReturnShipment"("labelId");
