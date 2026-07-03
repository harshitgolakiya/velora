import "dotenv/config";

import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { MediaType, ProductStatus } from "@prisma/client";
import { prisma } from "../src/lib/prisma";
import { normalizeCatalogAttribute, uniqueCatalogAttributes } from "../src/lib/catalog-attributes";
import { slugify } from "../src/lib/utils";

type CsvRow = Record<string, string>;

const COLOR_HEX: Record<string, string> = {
  Black: "#181818",
  Burgundy: "#6d1f36",
  "Cheery Red": "#c72f3e",
  Espresso: "#4b3027",
  Evergreen: "#355c4a",
  Fawn: "#c7a889",
  "Ice Blue": "#b9d8e5",
  Lavander: "#b9a4cf",
  "Light Blue": "#a9cce0",
  Lilac: "#bca9d4",
  Nude: "#d2ad93",
  "Pink Cloud": "#e9cbd3",
  Purple: "#79558e",
  "Rose Latte": "#b9827c",
  "Sage Green": "#91a58d",
  "Snow White": "#f4f2ed",
  "Soft Olive": "#9ca783",
  White: "#f5f5f0",
};

const CATEGORY_NAMES: Record<string, string> = {
  TOPS: "Tops",
  LEGGINGS: "Leggings",
  JACKETS: "Jackets",
  "SPORTS BRA": "Sports Bras",
  Tumbler: "Tumblers",
};

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (quoted) {
      if (char === '"' && next === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field.length || row.length) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }

  const headers = rows.shift()?.map((header) => header.trim()) ?? [];
  return rows
    .filter((values) => values.some(Boolean))
    .map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])));
}

function decodeHtml(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\\n/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#039;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .replace(/Easy Returns Within 30 days\s*\(exclusion apply\)/gi, "")
    .trim();
}

function normalizeColor(value: string) {
  const normalized = normalizeCatalogAttribute(value, "One Color") ?? "One Color";
  const words = normalized.toLowerCase().split(/\s+/);
  return words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ")
    .replace("Lavander", "Lavander")
    .replace("Cheery Red", "Cheery Red");
}

function normalizeSize(value: string) {
  return normalizeCatalogAttribute(value, "One Size") ?? "One Size";
}

function splitList(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function parseNumber(value: string, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function imageExtension(url: string, contentType: string | null) {
  const pathname = new URL(url).pathname;
  const extension = path.extname(pathname).toLowerCase();
  if (/^\.(jpe?g|png|webp|avif|gif)$/.test(extension)) return extension === ".jpeg" ? ".jpg" : extension;
  if (contentType?.includes("png")) return ".png";
  if (contentType?.includes("webp")) return ".webp";
  if (contentType?.includes("avif")) return ".avif";
  return ".jpg";
}

async function downloadImages(urls: string[]) {
  const outputDir = path.join(process.cwd(), "public", "images", "products", "woocommerce");
  await mkdir(outputDir, { recursive: true });
  const existingFiles = await readdir(outputDir);
  const result = new Map<string, string>();

  for (const [index, url] of urls.entries()) {
    try {
      const hash = createHash("sha1").update(url).digest("hex").slice(0, 12);
      const existingFilename = existingFiles.find((filename) => filename.includes(hash));
      if (existingFilename) {
        result.set(url, `/images/products/woocommerce/${existingFilename}`);
        continue;
      }
      const response = await fetch(url, { redirect: "follow" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const bytes = Buffer.from(await response.arrayBuffer());
      const sourceName = path.basename(new URL(url).pathname, path.extname(new URL(url).pathname));
      const safeName = slugify(sourceName).slice(0, 70) || "product";
      const filename = `${safeName}-${hash}${imageExtension(url, response.headers.get("content-type"))}`;
      await writeFile(path.join(outputDir, filename), bytes);
      result.set(url, `/images/products/woocommerce/${filename}`);
      console.log(`[images ${index + 1}/${urls.length}] ${filename}`);
    } catch (error) {
      console.warn(`Unable to download ${url}:`, error instanceof Error ? error.message : error);
    }
  }

  return result;
}

function uniqueSlug(name: string, wordpressId: string) {
  return `${slugify(name)}-${wordpressId}`;
}

async function main() {
  const csvPath = process.argv[2];
  if (!csvPath) throw new Error("Usage: npm run import:woocommerce -- <woocommerce-export.csv>");

  const csv = await readFile(path.resolve(csvPath), "utf8");
  const rows = parseCsv(csv.replace(/^\uFEFF/, ""));
  const parents = rows.filter((row) => row.Type === "variable");
  const variationsByParent = new Map<string, CsvRow[]>();

  for (const variation of rows.filter((row) => row.Type === "variation")) {
    const parentId = variation.Parent.replace(/^id:/, "").trim();
    const variations = variationsByParent.get(parentId) ?? [];
    variations.push(variation);
    variationsByParent.set(parentId, variations);
  }

  const imageUrls = [...new Set(rows.flatMap((row) => splitList(row.Images)).filter((url) => /^https?:\/\//.test(url)))];
  console.log(`Importing ${parents.length} products, ${rows.filter((row) => row.Type === "variation").length} variations, ${imageUrls.length} images.`);
  const localImages = await downloadImages(imageUrls);

  const existing = await prisma.product.findMany({
    include: {
      category: true,
      images: true,
      variants: { include: { color: true, size: true, medias: true } },
    },
  });
  const backupDir = path.join(process.cwd(), "backups");
  await mkdir(backupDir, { recursive: true });
  const backupPath = path.join(backupDir, `catalog-before-woocommerce-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  await writeFile(backupPath, JSON.stringify(existing, null, 2));
  console.log(`Catalog JSON backup: ${backupPath}`);

  await prisma.$transaction(async (tx) => {
    await tx.orderItem.deleteMany();
    await tx.cartItem.deleteMany();
    await tx.wishlistItem.deleteMany();
    await tx.review.deleteMany();
    await tx.payment.deleteMany();
    await tx.shipment.deleteMany();
    await tx.order.deleteMany();
    await tx.cart.deleteMany();
    await tx.inventoryLog.deleteMany();
    await tx.variantMedia.deleteMany();
    await tx.productVariant.deleteMany();
    await tx.productImage.deleteMany();
    await tx.product.deleteMany();
    await tx.color.deleteMany();
    await tx.size.deleteMany();
    await tx.category.deleteMany();
  });

  const categoryCache = new Map<string, string>();
  const colorCache = new Map<string, string>();
  const sizeCache = new Map<string, string>();

  for (const parent of parents) {
    const variations = variationsByParent.get(parent.ID) ?? [];
    if (!variations.length) {
      console.warn(`Skipping ${parent.Name}: no variations.`);
      continue;
    }

    const rawCategory = splitList(parent.Categories)[0] || "Uncategorized";
    const categoryName = CATEGORY_NAMES[rawCategory] ?? rawCategory;
    const categorySlug = slugify(categoryName);
    let categoryId = categoryCache.get(categorySlug);
    if (!categoryId) {
      const category = await prisma.category.upsert({
        where: { slug: categorySlug },
        update: { name: categoryName },
        create: { name: categoryName, slug: categorySlug },
      });
      categoryId = category.id;
      categoryCache.set(categorySlug, category.id);
    }

    const regularPrices = variations.map((row) => parseNumber(row["Regular price"])).filter((price) => price > 0);
    const salePrices = variations.map((row) => parseNumber(row["Sale price"])).filter((price) => price > 0);
    const price = Math.min(...regularPrices);
    const salePrice = salePrices.length ? Math.min(...salePrices) : null;
    const description = decodeHtml(parent.Description || parent["Short description"]) || `${parent.Name} from the latest collection.`;
    const parentImages = splitList(parent.Images).map((url) => localImages.get(url)).filter(Boolean) as string[];
    const tags = uniqueCatalogAttributes(splitList(parent.Tags));

    const product = await prisma.product.create({
      data: {
        title: parent.Name.trim(),
        slug: uniqueSlug(parent.Name, parent.ID),
        description,
        price,
        salePrice: salePrice && salePrice < price ? salePrice : null,
        sku: parent.SKU.trim() || `WC-${parent.ID}`,
        fabricDetails: "See garment label for composition details.",
        careInstructions: "Follow the care instructions on the garment label.",
        seoTitle: parent.Name.trim(),
        seoDescription: description.slice(0, 160),
        featured: parent["Is featured?"] === "1",
        bestSeller: tags.some((tag) => /best.?seller/i.test(tag)),
        newArrival: tags.some((tag) => /new/i.test(tag)),
        status: parent.Published === "1" ? ProductStatus.PUBLISHED : ProductStatus.DRAFT,
        publishedAt: parent.Published === "1" ? new Date() : null,
        categoryId,
        images: {
          create: parentImages.map((url, position) => ({
            url,
            alt: parent.Name.trim(),
            position,
          })),
        },
        tags: tags.length
          ? {
              connectOrCreate: tags.map((tag) => ({
                where: { name: tag },
                create: { name: tag },
              })),
            }
          : undefined,
      },
    });

    const colorGallery = new Map<string, string[]>();
    for (const variation of variations) {
      const color = normalizeColor(variation["Attribute 1 value(s)"]);
      const image = localImages.get(splitList(variation.Images)[0] ?? "");
      if (image) {
        const images = colorGallery.get(color) ?? [];
        if (!images.includes(image)) images.push(image);
        colorGallery.set(color, images);
      }
    }

    for (const variation of variations) {
      const colorName = normalizeColor(variation["Attribute 1 value(s)"]);
      const sizeName = normalizeSize(variation["Attribute 2 value(s)"]);

      let colorId = colorCache.get(colorName);
      if (!colorId) {
        const color = await prisma.color.create({
          data: { name: colorName, hex: COLOR_HEX[colorName] ?? "#9b9b9b" },
        });
        colorId = color.id;
        colorCache.set(colorName, color.id);
      }

      let sizeId = sizeCache.get(sizeName);
      if (!sizeId) {
        const size = await prisma.size.create({ data: { id: sizeName, name: sizeName } });
        sizeId = size.id;
        sizeCache.set(sizeName, size.id);
      }

      const gallery = [...(colorGallery.get(colorName) ?? []), ...parentImages].filter(
        (url, index, values) => values.indexOf(url) === index,
      );

      await prisma.productVariant.create({
        data: {
          productId: product.id,
          colorId,
          sizeId,
          sku: variation.SKU.trim() || `WC-${variation.ID}`,
          stock: Math.max(0, Math.trunc(parseNumber(variation.Stock))),
          lowStockThreshold: Math.max(0, Math.trunc(parseNumber(variation["Low stock amount"], 5))),
          allowBackorder: variation["Backorders allowed?"] !== "0",
          medias: {
            create: gallery.map((url, sortOrder) => ({
              type: MediaType.IMAGE,
              url,
              sortOrder,
              isHoverImage: sortOrder === 1,
            })),
          },
        },
      });
    }

    console.log(`Imported ${parent.Name} (${variations.length} variants)`);
  }

  const summary = {
    products: await prisma.product.count(),
    variants: await prisma.productVariant.count(),
    categories: await prisma.category.count(),
    colors: await prisma.color.count(),
    sizes: await prisma.size.count(),
    images: await prisma.productImage.count(),
  };
  console.log("Import complete:", summary);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
