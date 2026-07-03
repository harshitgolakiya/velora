import { after, NextResponse } from "next/server";
import { z } from "zod";
import { recordAdminActivity } from "@/lib/admin-activity";
import { requireAdminApiPermission } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import { enqueueBackInStockAlertsForInventoryLog, processProductAlertQueue } from "@/lib/product-alert-queue";

const importSchema = z.object({
  rows: z.array(
    z.object({
      sku: z.string().trim().min(1),
      stock: z.coerce.number().int().min(0),
      lowStockThreshold: z.coerce.number().int().min(0).default(5),
      allowBackorder: z.boolean().default(false),
      reason: z.string().trim().min(1).default("CSV_IMPORT"),
    }),
  ).min(1).max(2000),
});

export async function POST(request: Request) {
  const auth = await requireAdminApiPermission("inventory:write");
  if ("response" in auth) return auth.response;

  const parsed = importSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid inventory import", errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const variants = await prisma.productVariant.findMany({
    where: { sku: { in: parsed.data.rows.map((row) => row.sku) } },
    select: { id: true, sku: true, stock: true, reservedStock: true },
  });
  const bySku = new Map(variants.map((variant) => [variant.sku, variant]));
  const missingSkus = parsed.data.rows.filter((row) => !bySku.has(row.sku)).map((row) => row.sku);
  const matchedRows = parsed.data.rows.filter((row) => bySku.has(row.sku));

  const transitionLogIds: string[] = [];
  await prisma.$transaction(async (tx) => {
    for (const row of matchedRows) {
      const variant = bySku.get(row.sku)!;
      await tx.productVariant.update({
          where: { id: variant.id },
          data: {
            stock: row.stock,
            lowStockThreshold: row.lowStockThreshold,
            allowBackorder: row.allowBackorder,
          },
        });
      if (variant.stock !== row.stock) {
        const log = await tx.inventoryLog.create({
          data: {
            variantId: variant.id,
            oldStock: variant.stock,
            newStock: row.stock,
            delta: row.stock - variant.stock,
            reason: row.reason,
            note: "Inventory CSV import",
            actor: auth.access.name,
          },
        });
        transitionLogIds.push(log.id);
      }
    }
  });

  await Promise.all(transitionLogIds.map((logId) => enqueueBackInStockAlertsForInventoryLog(logId)));
  if (transitionLogIds.length) after(() => processProductAlertQueue().catch(() => undefined));

  await recordAdminActivity({
    action: `Imported inventory for ${matchedRows.length} variants`,
    entityType: "inventory",
    actor: auth.access.name,
    metadata: { importedSkus: matchedRows.map((row) => row.sku), missingSkus },
  });

  return NextResponse.json({
    updated: matchedRows.length,
    missingSkus,
  });
}
