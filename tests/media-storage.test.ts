import { existsSync } from "node:fs";
import { rm } from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { storeAdminMediaFile } from "@/lib/media-storage";

const storedFiles: string[] = [];

afterEach(async () => {
  await Promise.all(storedFiles.splice(0).map((filePath) => rm(filePath, { force: true })));
});

describe("admin media storage", () => {
  it("stores uploaded admin media locally and keeps original asset metadata", async () => {
    const bytes = Buffer.from("not-a-real-webp-but-valid-upload-by-mime");
    const file = new File([new Uint8Array(bytes)], "Hero Image.webp", { type: "image/webp" });

    const stored = await storeAdminMediaFile(file);
    const diskPath = path.join(process.cwd(), "public", stored.url);
    storedFiles.push(diskPath);

    expect(stored.provider).toBe("local");
    expect(stored.storageKey).toMatch(/\.webp$/);
    expect(stored.url).toMatch(/^\/images\/admin\/products\/.+\.webp$/);
    expect(stored.originalUrl).toBe(stored.url);
    expect(stored.bytes).toEqual(bytes);
    expect(stored.optimization.optimizedFormat).toBe("WEBP");
    expect(stored.derivativeManifest).toEqual([]);
    expect(existsSync(diskPath)).toBe(true);
  });

  it("rejects unsupported media types before writing files", async () => {
    const file = new File([new Uint8Array(Buffer.from("hello"))], "notes.txt", { type: "text/plain" });

    await expect(storeAdminMediaFile(file)).rejects.toThrow("Unsupported file type: text/plain");
  });
});
