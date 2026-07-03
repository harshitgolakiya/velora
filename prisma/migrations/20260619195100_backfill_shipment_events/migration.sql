INSERT INTO "ShipmentEvent" (
  "id",
  "shipmentId",
  "status",
  "carrier",
  "trackingNo",
  "message",
  "actor",
  "createdAt"
)
SELECT
  'legacy-shipment-' || "id",
  "id",
  "status",
  "carrier",
  "trackingNo",
  CASE
    WHEN LOWER("status") = 'delivered' THEN 'Order delivered'
    WHEN LOWER("status") = 'shipped' THEN 'Order dispatched'
    ELSE 'Shipment updated'
  END,
  'System migration',
  COALESCE("deliveredAt", "shippedAt", CURRENT_TIMESTAMP)
FROM "Shipment"
WHERE ("status" <> 'pending' OR "carrier" IS NOT NULL OR "trackingNo" IS NOT NULL)
  AND NOT EXISTS (
    SELECT 1 FROM "ShipmentEvent" WHERE "ShipmentEvent"."shipmentId" = "Shipment"."id"
  );
