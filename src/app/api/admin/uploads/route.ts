import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { requireAdminApiPermission } from "@/lib/admin-api";
import { recordAdminActivity } from "@/lib/admin-activity";
import { getMediaOptimizationMetadata } from "@/lib/media-optimization";
import { prisma } from "@/lib/prisma";

const uploadDir = path.join(process.cwd(), "public", "images", "admin", "products");
const publicPrefix = "/images/admin/products";
const allowedTypes = new Set([
  "image/avif",
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/webm",
]);

function extensionFor(file: File) {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]+$/.test(fromName)) return fromName;
  return file.type.split("/").pop() || "bin";
}

export async function POST(request: Request) {
  const auth = await requireAdminApiPermission("media:write");
  if ("response" in auth) return auth.response;

  const formData = await request.formData();
  const files = formData.getAll("files").filter((entry): entry is File => entry instanceof File);

  if (!files.length) {
    return NextResponse.json({ message: "No files uploaded" }, { status: 400 });
  }

  await mkdir(uploadDir, { recursive: true });

  const uploaded = await Promise.all(
    files.map(async (file) => {
      if (!allowedTypes.has(file.type)) {
        throw new Error(`Unsupported file type: ${file.type || file.name}`);
      }

      const extension = extensionFor(file);
      const filename = `${Date.now()}-${randomUUID()}.${extension}`;
      const bytes = Buffer.from(await file.arrayBuffer());
      await writeFile(path.join(uploadDir, filename), bytes);
      const url = `${publicPrefix}/${filename}`;
      const mediaType = file.type.startsWith("video/") ? "VIDEO" : "IMAGE";
      const optimization = getMediaOptimizationMetadata(bytes, file.type);
      const asset = await prisma.mediaAsset.create({
        data: {
          name: file.name.replace(/\.[^.]+$/, ""),
          originalName: file.name,
          url,
          originalUrl: url,
          mimeType: file.type,
          mediaType,
          sizeBytes: bytes.byteLength,
          width: optimization.width,
          height: optimization.height,
          aspectRatio: optimization.aspectRatio,
          optimizedFormat: optimization.optimizedFormat,
          responsiveWidths: JSON.stringify(optimization.responsiveWidths),
          derivativeManifest: JSON.stringify(
            optimization.responsiveWidths.map((width) => ({
              width,
              url,
              format: optimization.optimizedFormat,
            })),
          ),
          optimizationNotes: optimization.optimizationNotes,
          folder: "products",
          uploadedBy: auth.access.name,
        },
      });

      return {
        id: asset.id,
        name: asset.name,
        originalName: asset.originalName,
        type: asset.mimeType,
        mediaType: asset.mediaType,
        sizeBytes: asset.sizeBytes,
        width: asset.width ?? undefined,
        height: asset.height ?? undefined,
        aspectRatio: asset.aspectRatio ?? undefined,
        optimizedFormat: asset.optimizedFormat ?? undefined,
        responsiveWidths: JSON.parse(asset.responsiveWidths) as number[],
        optimizationNotes: asset.optimizationNotes ?? undefined,
        url: asset.url,
        originalUrl: asset.originalUrl ?? undefined,
        derivativeManifest: JSON.parse(asset.derivativeManifest) as Array<{ width: number; url: string; format?: string }>,
        focalPointX: asset.focalPointX,
        focalPointY: asset.focalPointY,
        createdAt: asset.createdAt.toISOString(),
      };
    }),
  );

  await recordAdminActivity({
    action: `Uploaded ${uploaded.length} media asset${uploaded.length !== 1 ? "s" : ""}`,
    entityType: "media_asset",
    actor: auth.access.name,
    metadata: { urls: uploaded.map((file) => file.url) },
  });

  return NextResponse.json({ files: uploaded });
}
