import "dotenv/config";

import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { copyFile, mkdir, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { resolveDatabaseUrl } from "../src/lib/database-url";

type IntegrityRow = { integrity_check?: string };
type CountRow = { count: number | bigint };

function normalizeFileUrl(filePath: string) {
  return `file:${filePath.replace(/\\/g, "/")}`;
}

function pathFromDatabaseUrl(databaseUrl: string) {
  if (!databaseUrl.startsWith("file:")) {
    throw new Error("backup:restore-drill currently supports local file: SQLite/libSQL DATABASE_URL values only.");
  }

  const rawPath = databaseUrl.slice("file:".length);
  if (!rawPath.trim()) throw new Error("DATABASE_URL points to an empty file path.");
  return path.isAbsolute(rawPath) ? rawPath : path.resolve(process.cwd(), rawPath);
}

async function countFiles(dir: string): Promise<number> {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    const nested = await Promise.all(entries.map((entry) => {
      const entryPath = path.join(dir, entry.name);
      return entry.isDirectory() ? countFiles(entryPath) : 1;
    }));
    return nested.reduce((sum, value) => sum + value, 0);
  } catch {
    return 0;
  }
}

async function tableCount(client: PrismaClient, table: string) {
  const safeTable = table.replace(/"/g, "\"\"");
  const rows = await client.$queryRawUnsafe<CountRow[]>(`SELECT COUNT(*) as count FROM "${safeTable}"`);
  return Number(rows[0]?.count ?? 0);
}

async function main() {
  const databaseUrl = resolveDatabaseUrl() ?? "file:./prisma/dev.db";
  const sourcePath = pathFromDatabaseUrl(databaseUrl);
  const sourceStats = await stat(sourcePath);
  if (!sourceStats.isFile()) throw new Error(`DATABASE_URL does not point to a database file: ${sourcePath}`);

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const drillDir = path.join(process.cwd(), ".restore-drill", stamp);
  await mkdir(drillDir, { recursive: true });

  const backupPath = path.join(drillDir, "backup.db");
  const restoredPath = path.join(drillDir, "restored.db");
  await copyFile(sourcePath, backupPath);
  await copyFile(backupPath, restoredPath);

  const restored = new PrismaClient({
    adapter: new PrismaLibSql({ url: normalizeFileUrl(restoredPath) }),
    log: ["error"],
  });

  try {
    const integrity = await restored.$queryRawUnsafe<IntegrityRow[]>("PRAGMA integrity_check");
    const integrityStatus = integrity[0]?.integrity_check ?? "unknown";
    if (integrityStatus !== "ok") throw new Error(`Restored database integrity check failed: ${integrityStatus}`);

    const [products, variants, orders, users, pages, mediaAssets] = await Promise.all([
      tableCount(restored, "Product"),
      tableCount(restored, "ProductVariant"),
      tableCount(restored, "Order"),
      tableCount(restored, "User"),
      tableCount(restored, "PageContent"),
      tableCount(restored, "MediaAsset"),
    ]);

    const mediaDir = path.join(process.cwd(), "public", "images", "admin", "products");
    const report = {
      status: "passed",
      checkedAt: new Date().toISOString(),
      sourcePath,
      backupPath,
      restoredPath,
      sourceBytes: sourceStats.size,
      integrity: integrityStatus,
      counts: {
        products,
        variants,
        orders,
        users,
        pages,
        mediaAssets,
      },
      localAdminMediaFiles: await countFiles(mediaDir),
    };

    await writeFile(path.join(drillDir, "restore-report.json"), `${JSON.stringify(report, null, 2)}\n`);
    await writeFile(path.join(process.cwd(), ".restore-drill", "latest-report.json"), `${JSON.stringify(report, null, 2)}\n`);
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await restored.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
