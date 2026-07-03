export const MAX_RETURN_EVIDENCE_FILES = 5;
export const MAX_RETURN_EVIDENCE_BYTES = 5 * 1024 * 1024;

export const RETURN_EVIDENCE_EXTENSIONS = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

export function validateReturnEvidence(bytes: Uint8Array, mimeType: string, sizeBytes: number) {
  const extension = RETURN_EVIDENCE_EXTENSIONS.get(mimeType);
  if (!extension) throw new Error("Only JPEG, PNG, and WebP images are supported.");
  if (sizeBytes < 1 || sizeBytes > MAX_RETURN_EVIDENCE_BYTES) throw new Error("Each image must be 5 MB or smaller.");

  const signatureMatches =
    (mimeType === "image/jpeg" && bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) ||
    (mimeType === "image/png" && bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((value, index) => bytes[index] === value)) ||
    (mimeType === "image/webp" && bytes.length >= 12 && Buffer.from(bytes.subarray(0, 4)).toString("ascii") === "RIFF" && Buffer.from(bytes.subarray(8, 12)).toString("ascii") === "WEBP");

  if (!signatureMatches) throw new Error("The uploaded file does not match its image type.");
  return extension;
}
