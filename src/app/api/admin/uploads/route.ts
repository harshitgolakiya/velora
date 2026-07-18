import { NextResponse } from "next/server";
import { requireAdminApiPermission } from "@/lib/admin-api";
import { recordAdminActivity } from "@/lib/admin-activity";
import { storeAdminMediaFile } from "@/lib/media-storage";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const auth = await requireAdminApiPermission("media:write");
  if ("response" in auth) return auth.response;

  const formData = await request.formData();
  const files = formData.getAll("files").filter((entry): entry is File => entry instanceof File);

  if (!files.length) {
    return NextResponse.json({ message: "No files uploaded" }, { status: 400 });
  }

  const uploaded = await Promise.all(
    files.map(async (file) => {
      const stored = await storeAdminMediaFile(file);
      const mediaType = file.type.startsWith("video/") ? "VIDEO" : "IMAGE";
      const optimization = stored.optimization;
      const asset = await prisma.mediaAsset.create({
        data: {
          name: file.name.replace(/\.[^.]+$/, ""),
          originalName: file.name,
          url: stored.url,
          originalUrl: stored.originalUrl,
          mimeType: file.type,
          mediaType,
          sizeBytes: stored.bytes.byteLength,
          width: optimization.width,
          height: optimization.height,
          aspectRatio: optimization.aspectRatio,
          optimizedFormat: optimization.optimizedFormat,
          responsiveWidths: JSON.stringify(optimization.responsiveWidths),
          derivativeManifest: JSON.stringify(stored.derivativeManifest),
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
