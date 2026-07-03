import { NextResponse } from "next/server";
import { ProductStatus } from "@prisma/client";
import { recordAdminActivity } from "@/lib/admin-activity";
import { requireAdminApiPermission } from "@/lib/admin-api";
import { mapAdminProduct } from "@/lib/admin-catalog";
import { buildVariantSku, validateExplicitProductSkus } from "@/lib/admin-product-validation";
import { normalizeCatalogAttribute } from "@/lib/catalog-attributes";
import { buildExplicitImportVariants } from "@/lib/product-import-variants";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";

// ── Minimal RFC-4180 CSV parser ────────────────────────────────────────────────

function parseLine(line: string): string[] {
  const cols: string[] = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === '"') {
      i++; // skip opening quote
      let val = "";
      while (i < line.length) {
        if (line[i] === '"') {
          if (line[i + 1] === '"') {
            val += '"';
            i += 2;
          } else {
            i++;
            break;
          }
        } else {
          val += line[i++];
        }
      }
      cols.push(val);
      if (i < line.length && line[i] === ",") i++;
    } else {
      const end = line.indexOf(",", i);
      if (end === -1) {
        cols.push(line.slice(i));
        break;
      }
      cols.push(line.slice(i, end));
      i = end + 1;
    }
  }
  if (line.endsWith(",")) cols.push("");
  return cols;
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim()
    .split("\n");
  if (lines.length < 2) return [];

  const headers = parseLine(lines[0]).map((h) =>
    h.trim().toLowerCase().replace(/\s+/g, "_"),
  );

  return lines
    .slice(1)
    .filter((l) => l.trim())
    .map((line) => {
      const vals = parseLine(line);
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => {
        row[h] = (vals[idx] ?? "").trim();
      });
      return row;
    });
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface ColorEntry {
  originalName: string;
  hex: string;
  sizes: Map<string, number>; // sizeName → stock
  skuBySize: Map<string, string>; // sizeName → variant SKU
}

interface ProductGroup {
  name: string;
  sku: string;
  price: number;
  salePrice?: number;
  categoryName: string;
  description: string;
  fabricDetails: string;
  careInstructions: string;
  status: "DRAFT" | "PUBLISHED";
  colors: Map<string, ColorEntry>; // lowerName → ColorEntry
  rowNumbers: number[];
}

// ── Required columns ──────────────────────────────────────────────────────────

const REQUIRED = [
  "name",
  "sku",
  "price",
  "category",
  "description",
  "fabric_details",
  "care_instructions",
  "color_name",
  "color_hex",
  "size_name",
  "stock",
] as const;

function normalizeHex(value: string) {
  return value.startsWith("#") ? value : `#${value}`;
}

function isValidHex(value: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

function sameProductCore(product: ProductGroup, row: Record<string, string>) {
  const priceNum = parseFloat(row.price);
  const salePrice = row.sale_price ? parseFloat(row.sale_price) : undefined;

  return (
    product.name === row.name &&
    product.categoryName.toLowerCase() === row.category.toLowerCase() &&
    product.description === row.description &&
    product.fabricDetails === row.fabric_details &&
    product.careInstructions === row.care_instructions &&
    product.price === priceNum &&
    (product.salePrice ?? undefined) === (Number.isFinite(salePrice) ? salePrice : undefined)
  );
}

// ── Slug helper ───────────────────────────────────────────────────────────────

async function uniqueSlug(name: string) {
  const base = slugify(name);
  let slug = base;
  let suffix = 2;
  while (await prisma.product.findUnique({ where: { slug } })) {
    slug = `${base}-${suffix++}`;
  }
  return slug;
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const auth = await requireAdminApiPermission("catalog:write");
  if ("response" in auth) return auth.response;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ message: "Expected multipart/form-data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ message: "No file uploaded" }, { status: 400 });
  }

  const text = await (file as File).text();
  const rows = parseCSV(text);

  if (rows.length === 0) {
    return NextResponse.json(
      { message: "CSV is empty or contains no data rows" },
      { status: 400 },
    );
  }

  // Validate required headers
  const firstRowKeys = Object.keys(rows[0]);
  const missingCols = REQUIRED.filter((col) => !firstRowKeys.includes(col));
  if (missingCols.length > 0) {
    return NextResponse.json(
      { message: `Missing required columns: ${missingCols.join(", ")}` },
      { status: 400 },
    );
  }

  // ── Parse rows into product groups ────────────────────────────────────────
  const productMap = new Map<string, ProductGroup>();
  const rowErrors: { row: number; error: string }[] = [];
  const invalidProductSkus = new Set<string>();

  rows.forEach((row, idx) => {
    const rowNum = idx + 2; // +1 for header, +1 for 1-based
    const {
      name,
      sku,
      price,
      sale_price,
      category,
      description,
      fabric_details,
      care_instructions,
      status,
      color_name,
      color_hex,
      size_name,
      stock,
      variant_sku,
    } = row;

    if (!name || !sku || !price || !category || !description || !fabric_details || !care_instructions || !color_name || !color_hex || !size_name) {
      rowErrors.push({ row: rowNum, error: "One or more required fields are empty" });
      if (sku) invalidProductSkus.add(sku);
      return;
    }

    const normalizedColorName = normalizeCatalogAttribute(color_name);
    if (!normalizedColorName) {
      rowErrors.push({ row: rowNum, error: `Invalid color_name "${color_name}"` });
      invalidProductSkus.add(sku);
      return;
    }

    const normalizedSizeName = normalizeCatalogAttribute(size_name);
    if (!normalizedSizeName) {
      rowErrors.push({ row: rowNum, error: `Invalid size_name "${size_name}"` });
      invalidProductSkus.add(sku);
      return;
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      rowErrors.push({ row: rowNum, error: `Invalid price "${price}" — must be a positive number` });
      invalidProductSkus.add(sku);
      return;
    }

    if (sale_price) {
      const salePriceNum = parseFloat(sale_price);
      if (isNaN(salePriceNum) || salePriceNum <= 0) {
        rowErrors.push({ row: rowNum, error: `Invalid sale_price "${sale_price}" — must be a positive number` });
        invalidProductSkus.add(sku);
        return;
      }
      if (salePriceNum >= priceNum) {
        rowErrors.push({ row: rowNum, error: "sale_price must be lower than price" });
        invalidProductSkus.add(sku);
        return;
      }
    }

    const stockNum = parseInt(stock, 10);
    if (isNaN(stockNum) || stockNum < 0) {
      rowErrors.push({ row: rowNum, error: `Invalid stock "${stock}" — must be a non-negative integer` });
      invalidProductSkus.add(sku);
      return;
    }

    const hex = normalizeHex(color_hex);
    if (!isValidHex(hex)) {
      rowErrors.push({ row: rowNum, error: `Invalid color_hex "${color_hex}" — use #RRGGBB` });
      invalidProductSkus.add(sku);
      return;
    }

    const statusValue = status?.trim().toUpperCase();
    if (statusValue && statusValue !== "DRAFT" && statusValue !== "PUBLISHED") {
      rowErrors.push({ row: rowNum, error: `Invalid status "${status}" — use DRAFT or PUBLISHED` });
      invalidProductSkus.add(sku);
      return;
    }

    if (!productMap.has(sku)) {
      productMap.set(sku, {
        name,
        sku,
        price: priceNum,
        salePrice: sale_price ? (parseFloat(sale_price) || undefined) : undefined,
        categoryName: category,
        description,
        fabricDetails: fabric_details,
        careInstructions: care_instructions,
        status: statusValue === "PUBLISHED" ? "PUBLISHED" : "DRAFT",
        colors: new Map(),
        rowNumbers: [],
      });
    } else if (!sameProductCore(productMap.get(sku)!, row)) {
      rowErrors.push({
        row: rowNum,
        error: `SKU "${sku}" has conflicting product-level data. Keep name, price, category, and descriptions identical for all rows with the same SKU.`,
      });
      invalidProductSkus.add(sku);
      return;
    }

    const product = productMap.get(sku)!;
    product.rowNumbers.push(rowNum);
    const colorKey = normalizedColorName.toLowerCase();
    if (!product.colors.has(colorKey)) {
      product.colors.set(colorKey, {
        originalName: normalizedColorName,
        hex,
        sizes: new Map(),
        skuBySize: new Map(),
      });
    } else if (product.colors.get(colorKey)!.hex.toLowerCase() !== hex.toLowerCase()) {
      rowErrors.push({
        row: rowNum,
        error: `Color "${normalizedColorName}" has conflicting hex values for SKU "${sku}"`,
      });
      invalidProductSkus.add(sku);
      return;
    }

    const color = product.colors.get(colorKey)!;
    if (color.sizes.has(normalizedSizeName)) {
      rowErrors.push({
        row: rowNum,
        error: `Duplicate size "${normalizedSizeName}" for color "${normalizedColorName}" and SKU "${sku}"`,
      });
      invalidProductSkus.add(sku);
      return;
    }

    color.sizes.set(normalizedSizeName, stockNum);
    if (variant_sku?.trim()) color.skuBySize.set(normalizedSizeName, variant_sku.trim());
  });

  if (productMap.size === 0) {
    return NextResponse.json(
      { message: "No valid products found after parsing", rowErrors },
      { status: 400 },
    );
  }

  // ── Look up categories ─────────────────────────────────────────────────────
  const allCategories = await prisma.category.findMany({
    select: { id: true, name: true },
  });
  const categoryByName = new Map(
    allCategories.map((c) => [c.name.toLowerCase(), c.id]),
  );

  // ── Create products ────────────────────────────────────────────────────────
  type CreatedProduct = Awaited<ReturnType<typeof mapAdminProduct>>;
  const created: CreatedProduct[] = [];
  const failed: { sku: string; name: string; error: string }[] = [];

  for (const [, product] of productMap) {
    if (invalidProductSkus.has(product.sku)) {
      failed.push({
        sku: product.sku,
        name: product.name,
        error: `Skipped because row ${product.rowNumbers.join(", ")} contains invalid data for this SKU.`,
      });
      continue;
    }

    const categoryId = categoryByName.get(product.categoryName.toLowerCase());
    if (!categoryId) {
      failed.push({
        sku: product.sku,
        name: product.name,
        error: `Category not found: "${product.categoryName}"`,
      });
      continue;
    }

    const colorEntries = [...product.colors.values()];
    const sizeNamesSet = new Set<string>();
    colorEntries.forEach((c) => c.sizes.forEach((_, sz) => sizeNamesSet.add(sz)));
    const sizeNames = [...sizeNamesSet];
    const explicitVariants = buildExplicitImportVariants(product.sku, colorEntries);
    const skuError = await validateExplicitProductSkus({
      productSku: product.sku,
      variantSkus: explicitVariants.map((variant) => variant.sku),
    });

    if (skuError) {
      failed.push({
        sku: product.sku,
        name: product.name,
        error: skuError,
      });
      continue;
    }

    try {
      const slug = await uniqueSlug(product.name);

      const productRow = await prisma.$transaction(async (tx) => {
        // Upsert colors
        const colors = await Promise.all(
          colorEntries.map(async (entry) => {
            const existing = await tx.color.findFirst({
              where: { name: entry.originalName },
            });
            return existing
              ? tx.color.update({ where: { id: existing.id }, data: { hex: entry.hex } })
              : tx.color.create({ data: { name: entry.originalName, hex: entry.hex } });
          }),
        );

        // Upsert only the sizes that exist in the import, but do not create
        // variants for color/size pairs that were not present in the CSV.
        const sizes = await Promise.all(
          sizeNames.map(async (szName) => {
            const existing = await tx.size.findFirst({ where: { name: szName } });
            return existing ?? tx.size.create({ data: { id: szName, name: szName } });
          }),
        );
        const sizeByName = new Map(sizes.map((size) => [size.name, size]));

        return tx.product.create({
          data: {
            title: product.name,
            slug,
            sku: product.sku,
            description: product.description,
            fabricDetails: product.fabricDetails,
            careInstructions: product.careInstructions,
            seoTitle: `${product.name} | Velora`,
            seoDescription: product.description.slice(0, 160),
            price: product.price,
            salePrice: product.salePrice ?? null,
            status: product.status as ProductStatus,
            publishedAt: product.status === "PUBLISHED" ? new Date() : null,
            featured: false,
            bestSeller: false,
            newArrival: false,
            categoryId,
            variants: {
              create: colors.flatMap((color, colorIdx) => {
                const entry = colorEntries[colorIdx];
                return [...entry.sizes.entries()].map(([sizeName, stock]) => {
                  const size = sizeByName.get(sizeName);
                  if (!size) throw new Error(`Size "${sizeName}" was not created.`);
                  return {
                    colorId: color.id,
                    sizeId: size.id,
                    sku: buildVariantSku(product.sku, sizeName, color.name, entry.skuBySize.get(sizeName)),
                    stock,
                  };
                });
              }),
            },
          },
          include: {
            category: true,
            collections: true,
            tags: { include: { _count: { select: { products: true } } } },
            images: { orderBy: { position: "asc" } },
            variants: {
              orderBy: [{ color: { name: "asc" } }, { size: { name: "asc" } }],
              include: {
                color: true,
                size: true,
                medias: { orderBy: { sortOrder: "asc" } },
              },
            },
          },
        });
      });

      created.push(mapAdminProduct(productRow));
    } catch (err) {
      const error = err instanceof Error ? err.message : "Unknown error";
      failed.push({ sku: product.sku, name: product.name, error });
    }
  }

  if (created.length || failed.length || rowErrors.length) {
    await recordAdminActivity({
      action: `Imported products from CSV: ${created.length} created, ${failed.length} failed`,
      entityType: "product",
      actor: auth.access.name,
      metadata: {
        created: created.length,
        failed: failed.length,
        rowErrors: rowErrors.length,
      },
    });
  }

  return NextResponse.json({
    created: created.length,
    failed: failed.length,
    products: created,
    failedProducts: failed,
    rowErrors,
  });
}
