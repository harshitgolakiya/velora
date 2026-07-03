import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { validateReturnEvidence } from "./return-evidence-validation";

export const MAX_REVIEW_MEDIA_FILES = 3;
const reviewMediaRoot = path.join(process.cwd(), "storage", "review-media");

export async function storeReviewMedia(reviewId: string, file: File) {
  const bytes = Buffer.from(await file.arrayBuffer());
  const extension = validateReturnEvidence(bytes, file.type, file.size);
  const storageKey = `${reviewId}/${randomUUID()}.${extension}`;
  const target = path.join(reviewMediaRoot, storageKey);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, bytes, { flag: "wx" });
  return { storageKey, bytes, mimeType: file.type };
}

export async function readReviewMedia(storageKey: string) {
  const root = path.resolve(reviewMediaRoot);
  const target = path.resolve(reviewMediaRoot, storageKey);
  if (!target.startsWith(`${root}${path.sep}`)) throw new Error("Invalid review media path");
  return readFile(target);
}

export async function deleteReviewMedia(storageKey: string) {
  const root = path.resolve(reviewMediaRoot);
  const target = path.resolve(reviewMediaRoot, storageKey);
  if (!target.startsWith(`${root}${path.sep}`)) return;
  await unlink(target).catch(() => undefined);
}
