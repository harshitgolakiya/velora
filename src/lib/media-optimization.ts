import "server-only";

import { imageSize } from "image-size";

const responsiveWidthSteps = [320, 480, 640, 768, 1024, 1280, 1440, 1920];

export type MediaOptimizationMetadata = {
  width?: number;
  height?: number;
  aspectRatio?: number;
  optimizedFormat?: string;
  responsiveWidths: number[];
  optimizationNotes?: string;
};

function preferredFormat(mimeType: string) {
  if (mimeType === "image/avif") return "AVIF";
  if (mimeType === "image/webp") return "WEBP";
  if (mimeType === "image/jpeg" || mimeType === "image/png") return "AVIF";
  return undefined;
}

export function getMediaOptimizationMetadata(bytes: Buffer, mimeType: string): MediaOptimizationMetadata {
  if (!mimeType.startsWith("image/")) {
    return { responsiveWidths: [], optimizationNotes: "Video asset. Transcode ladder metadata pending." };
  }

  let width: number | undefined;
  let height: number | undefined;

  try {
    const dimensions = imageSize(bytes);
    width = dimensions.width;
    height = dimensions.height;
  } catch {
    return {
      responsiveWidths: [],
      optimizedFormat: preferredFormat(mimeType),
      optimizationNotes: "Unable to read image dimensions from upload.",
    };
  }

  const responsiveWidths = width
    ? responsiveWidthSteps.filter((step) => step <= width)
    : [];
  if (width && !responsiveWidths.includes(width)) responsiveWidths.push(width);

  const notes: string[] = [];
  if (mimeType === "image/png" || mimeType === "image/jpeg") {
    notes.push("Serve AVIF/WebP derivatives from the CDN for production traffic.");
  }
  if (bytes.byteLength > 700_000) {
    notes.push("Large source file. Generate compressed responsive derivatives before launch.");
  }
  if (width && width > 1920) {
    notes.push("Oversized original. Keep as master, serve capped responsive sizes on storefront.");
  }

  return {
    width,
    height,
    aspectRatio: width && height ? Number((width / height).toFixed(4)) : undefined,
    optimizedFormat: preferredFormat(mimeType),
    responsiveWidths,
    optimizationNotes: notes.join(" "),
  };
}
