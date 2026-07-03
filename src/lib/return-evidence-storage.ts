import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  MAX_RETURN_EVIDENCE_BYTES,
  MAX_RETURN_EVIDENCE_FILES,
  validateReturnEvidence,
} from "@/lib/return-evidence-validation";

export { MAX_RETURN_EVIDENCE_BYTES, MAX_RETURN_EVIDENCE_FILES };

const evidenceRoot = path.join(process.cwd(), "storage", "return-evidence");

export async function storeReturnEvidence(requestId: string, file: File) {
  const bytes = Buffer.from(await file.arrayBuffer());
  const extension = validateReturnEvidence(bytes, file.type, file.size);

  const storageKey = `${requestId}/${randomUUID()}.${extension}`;
  const target = path.join(evidenceRoot, storageKey);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, bytes, { flag: "wx" });
  return { storageKey, bytes, mimeType: file.type };
}

export async function readReturnEvidence(storageKey: string) {
  const root = path.resolve(evidenceRoot);
  const target = path.resolve(evidenceRoot, storageKey);
  if (!target.startsWith(`${root}${path.sep}`)) throw new Error("Invalid evidence path");
  return readFile(target);
}

export async function deleteReturnEvidence(storageKey: string) {
  const root = path.resolve(evidenceRoot);
  const target = path.resolve(evidenceRoot, storageKey);
  if (!target.startsWith(`${root}${path.sep}`)) return;
  await unlink(target).catch(() => undefined);
}
