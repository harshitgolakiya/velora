import { unlink } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { z } from "zod";
import { recordAdminActivity } from "@/lib/admin-activity";
import { requireAdminApiPermission } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";

const mediaAssetSchema = z.object({
  name: z.string().trim().min(1),
  altText: z.string().trim().optional(),
  folder: z.string().trim().optional(),
  focalPointX: z.coerce.number().min(0).max(1).default(0.5),
  focalPointY: z.coerce.number().min(0).max(1).default(0.5),
  tags: z.array(z.string().trim().min(1)).default([]),
});

function mapAsset(row: {
  id: string;
  name: string;
  originalName: string;
  url: string;
  originalUrl: string | null;
  mimeType: string;
  mediaType: "IMAGE" | "VIDEO";
  sizeBytes: number;
  width: number | null;
  height: number | null;
  aspectRatio: number | null;
  optimizedFormat: string | null;
  responsiveWidths: string;
  derivativeManifest: string;
  optimizationNotes: string | null;
  altText: string | null;
  focalPointX: number;
  focalPointY: number;
  folder: string | null;
  tags: string;
  uploadedBy: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  let tags: string[] = [];
  let responsiveWidths: number[] = [];
  let derivativeManifest: Array<{ width: number; url: string; format?: string }> = [];
  try {
    tags = JSON.parse(row.tags) as string[];
  } catch {
    tags = [];
  }
  try {
    responsiveWidths = JSON.parse(row.responsiveWidths) as number[];
  } catch {
    responsiveWidths = [];
  }
  try {
    derivativeManifest = JSON.parse(row.derivativeManifest) as Array<{ width: number; url: string; format?: string }>;
  } catch {
    derivativeManifest = [];
  }

  return {
    id: row.id,
    name: row.name,
    originalName: row.originalName,
    url: row.url,
    originalUrl: row.originalUrl ?? undefined,
    mimeType: row.mimeType,
    mediaType: row.mediaType,
    sizeBytes: row.sizeBytes,
    width: row.width ?? undefined,
    height: row.height ?? undefined,
    aspectRatio: row.aspectRatio ?? undefined,
    optimizedFormat: row.optimizedFormat ?? undefined,
    responsiveWidths,
    derivativeManifest,
    optimizationNotes: row.optimizationNotes ?? undefined,
    altText: row.altText ?? undefined,
    focalPointX: row.focalPointX,
    focalPointY: row.focalPointY,
    folder: row.folder ?? undefined,
    tags,
    uploadedBy: row.uploadedBy,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function getUsageCount(url: string) {
  const [productImages, variantMedia, collectionBanners, homepageImages, homepageMobileImages] =
    await Promise.all([
      prisma.productImage.count({ where: { url } }),
      prisma.variantMedia.count({ where: { url } }),
      prisma.collection.count({ where: { bannerImage: url } }),
      prisma.homepageSection.count({ where: { imageUrl: url } }),
      prisma.homepageSection.count({ where: { mobileImageUrl: url } }),
    ]);

  return productImages + variantMedia + collectionBanners + homepageImages + homepageMobileImages;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApiPermission("media:write");
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const parsed = mediaAssetSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid media asset payload", errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const asset = await prisma.mediaAsset.update({
    where: { id },
    data: {
      name: data.name,
      altText: data.altText || null,
      folder: data.folder || null,
      focalPointX: data.focalPointX,
      focalPointY: data.focalPointY,
      tags: JSON.stringify(Array.from(new Set(data.tags.map((tag) => tag.toLowerCase())))),
    },
  });

  await recordAdminActivity({
    action: `Updated media asset ${asset.name}`,
    entityType: "media_asset",
    entityId: asset.id,
    actor: auth.access.name,
    metadata: { url: asset.url },
  });

  const usageCount = await getUsageCount(asset.url);
  return NextResponse.json({ asset: { ...mapAsset(asset), usageCount } });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApiPermission("media:write");
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const asset = await prisma.mediaAsset.findUnique({ where: { id } });

  if (!asset) {
    return NextResponse.json({ message: "Media asset not found" }, { status: 404 });
  }

  const usageCount = await getUsageCount(asset.url);
  if (usageCount > 0) {
    return NextResponse.json(
      { message: `This asset is used ${usageCount} time${usageCount !== 1 ? "s" : ""}. Remove those references before deleting.` },
      { status: 409 },
    );
  }

  await prisma.mediaAsset.delete({ where: { id } });

  const publicRoot = path.join(process.cwd(), "public");
  const filePath = path.normalize(path.join(publicRoot, asset.url.replace(/^\//, "")));
  if (filePath.startsWith(publicRoot)) {
    await unlink(filePath).catch(() => undefined);
  }

  await recordAdminActivity({
    action: `Deleted media asset ${asset.name}`,
    entityType: "media_asset",
    entityId: asset.id,
    actor: auth.access.name,
    metadata: { url: asset.url },
  });

  return NextResponse.json({ ok: true });
}
