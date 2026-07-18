import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getMediaOptimizationMetadata, type MediaOptimizationMetadata } from "./media-optimization";

const uploadDir = path.join(process.cwd(), "public", "images", "admin", "products");
const publicPrefix = "/images/admin/products";

export const allowedAdminMediaTypes = new Set([
  "image/avif",
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/webm",
]);

export type StoredAdminMedia = {
  provider: "local";
  storageKey: string;
  url: string;
  originalUrl: string;
  bytes: Buffer;
  optimization: MediaOptimizationMetadata;
  derivativeManifest: Array<{ width: number; url: string; format?: string }>;
};

function extensionFor(file: File) {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]+$/.test(fromName)) return fromName;
  return file.type.split("/").pop() || "bin";
}

export async function storeAdminMediaFile(file: File): Promise<StoredAdminMedia> {
  if (!allowedAdminMediaTypes.has(file.type)) {
    throw new Error(`Unsupported file type: ${file.type || file.name}`);
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const optimization = getMediaOptimizationMetadata(bytes, file.type);

  await mkdir(uploadDir, { recursive: true });
  const extension = extensionFor(file);
  const filename = `${Date.now()}-${randomUUID()}.${extension}`;
  await writeFile(path.join(uploadDir, filename), bytes, { flag: "wx" });
  const url = `${publicPrefix}/${filename}`;
  return {
    provider: "local",
    storageKey: filename,
    url,
    originalUrl: url,
    bytes,
    optimization,
    derivativeManifest: optimization.responsiveWidths.map((width) => ({
      width,
      url,
      format: optimization.optimizedFormat,
    })),
  };
}
