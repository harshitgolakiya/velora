INSERT INTO "RefundRecord" (
  "id",
  "orderId",
  "amount",
  "kind",
  "status",
  "note",
  "actor",
  "createdAt"
)
SELECT
  'legacy-refund-' || "id",
  "id",
  "refundAmount",
  CASE WHEN "refundAmount" >= "total" THEN 'FULL' ELSE 'PARTIAL' END,
  'COMPLETED',
  'Imported from the existing refund total.',
  'System migration',
  "updatedAt"
FROM "Order"
WHERE "refundAmount" IS NOT NULL
  AND "refundAmount" > 0
  AND NOT EXISTS (
    SELECT 1 FROM "RefundRecord" WHERE "RefundRecord"."orderId" = "Order"."id"
  );
