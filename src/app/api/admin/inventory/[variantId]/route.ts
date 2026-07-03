import { after, NextResponse } from "next/server";
import { recordAdminActivity } from "@/lib/admin-activity";
import { requireAdminApiPermission } from "@/lib/admin-api";
import { mapAdminInventoryRow } from "@/lib/admin-catalog";
import { updateStockSchema } from "@/lib/admin-validation";
import { prisma } from "@/lib/prisma";
import { enqueueBackInStockAlertsForInventoryLog, processProductAlertQueue } from "@/lib/product-alert-queue";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ variantId: string }> },
) {
  const auth = await requireAdminApiPermission("inventory:write");
  if ("response" in auth) return auth.response;

  const { variantId } = await params;
  const parsed = updateStockSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid inventory payload", errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const current = await tx.productVariant.findUnique({
        where: { id: variantId },
        select: {
          stock: true,
          reservedStock: true,
          lowStockThreshold: true,
          allowBackorder: true,
          backorderLimit: true,
          backorderShipsAt: true,
          backorderMessage: true,
        },
      });

      if (!current) {
        throw new Error("Variant not found");
      }

      const nextStock = parsed.data.stock;

      if (current.stock !== nextStock) {
        await tx.inventoryLog.create({
          data: {
            variantId,
            oldStock: current.stock,
            newStock: nextStock,
            delta: nextStock - current.stock,
            reason: parsed.data.reason ?? "MANUAL_ADJUSTMENT",
            note: parsed.data.note?.trim() || null,
          },
        });
      }

      const row = await tx.productVariant.update({
        where: { id: variantId },
        data: {
          stock: nextStock,
          reservedStock: parsed.data.reservedStock ?? current.reservedStock,
          lowStockThreshold: parsed.data.lowStockThreshold ?? current.lowStockThreshold,
          allowBackorder: parsed.data.allowBackorder ?? current.allowBackorder,
          backorderLimit: parsed.data.backorderLimit ?? current.backorderLimit,
          backorderShipsAt: parsed.data.backorderShipsAt
            ? new Date(parsed.data.backorderShipsAt)
            : parsed.data.backorderShipsAt === null
              ? null
              : current.backorderShipsAt,
          backorderMessage:
            parsed.data.backorderMessage === undefined
              ? current.backorderMessage
              : parsed.data.backorderMessage?.trim() || null,
        },
        include: {
          product: { select: { id: true, title: true, slug: true, updatedAt: true } },
          color: { select: { name: true, hex: true } },
          size: { select: { name: true } },
          inventoryLogs: {
            orderBy: { createdAt: "desc" },
            take: 5,
            include: {
              variant: {
                select: {
                  sku: true,
                  product: { select: { title: true } },
                  color: { select: { name: true } },
                  size: { select: { name: true } },
                },
              },
            },
          },
        },
      });

      return {
        row,
        changed: current.stock !== nextStock,
      };
    });

    const latestLog = result.row.inventoryLogs[0];
    if (result.changed && latestLog) {
      await recordAdminActivity({
        action: `Updated ${result.row.product.title} inventory (${result.row.color.name}/${result.row.size.name}) from ${latestLog.oldStock} to ${latestLog.newStock}`,
        entityType: "inventory",
        entityId: variantId,
        actor: auth.access.name,
        metadata: {
          productId: result.row.product.id,
          sku: result.row.sku,
          color: result.row.color.name,
          size: result.row.size.name,
          oldStock: latestLog.oldStock,
          newStock: latestLog.newStock,
          delta: latestLog.delta,
          note: latestLog.note,
        },
      });
      await enqueueBackInStockAlertsForInventoryLog(latestLog.id);
      after(() => processProductAlertQueue().catch(() => undefined));
    }

    return NextResponse.json({ inventory: mapAdminInventoryRow(result.row) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update inventory";
    const status = message === "Variant not found" ? 404 : 500;
    return NextResponse.json({ message }, { status });
  }
}
