import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

type Finding = {
  file: string;
  line: number;
  kind: string;
  preview: string;
};

const ignoredDirectories = new Set([
  ".git",
  ".next",
  ".next-stale",
  ".turbo",
  ".vercel",
  "artifacts",
  "backups",
  "build",
  "coverage",
  "node_modules",
  "out",
  "playwright-report",
  "storage",
  "test-results",
]);

const ignoredExtensions = new Set([
  ".avif",
  ".db",
  ".gif",
  ".ico",
  ".jpeg",
  ".jpg",
  ".pdf",
  ".png",
  ".sqlite",
  ".sqlite3",
  ".webp",
  ".zip",
]);

const ignoredFiles = new Set([
  "package-lock.json",
  "dev.db",
]);

const secretPatterns: Array<{ kind: string; pattern: RegExp }> = [
  { kind: "private key", pattern: /-----BEGIN (?:RSA |DSA |EC |OPENSSH |)?PRIVATE KEY-----/g },
  { kind: "AWS access key", pattern: /AKIA[0-9A-Z]{16}/g },
  { kind: "Google API key", pattern: /AIza[0-9A-Za-z_-]{35}/g },
  { kind: "GitHub token", pattern: /gh[pousr]_[A-Za-z0-9_]{30,}/g },
  { kind: "Stripe secret key", pattern: /sk_(?:live|test)_[A-Za-z0-9]{16,}/g },
  { kind: "Stripe webhook secret", pattern: /whsec_[A-Za-z0-9]{16,}/g },
  { kind: "Resend API key", pattern: /re_[A-Za-z0-9_]{20,}/g },
];

const assignmentPattern =
  /\b[A-Z0-9_]*(?:SECRET|TOKEN|PASSWORD|API_KEY|PRIVATE_KEY|WEBHOOK_SECRET|CLIENT_SECRET)[A-Z0-9_]*\s*[:=]\s*["']?([^"'\s#,;]{12,})["']?/g;

function isIgnoredPath(root: string, filePath: string) {
  const relative = path.relative(root, filePath);
  const parts = relative.split(path.sep);
  if (parts.some((part) => ignoredDirectories.has(part))) return true;
  if (parts.some((part) => part.endsWith("-snapshots"))) return true;

  const filename = path.basename(filePath);
  if (ignoredFiles.has(filename)) return true;
  if (filename.startsWith(".env") && filename !== ".env.example") return true;
  return ignoredExtensions.has(path.extname(filePath).toLowerCase());
}

function isPlaceholder(value: string) {
  const normalized = value.toLowerCase();
  return !value.trim()
    || normalized.includes("replace-with")
    || normalized.includes("placeholder")
    || normalized.includes("example")
    || normalized.includes("dummy")
    || normalized.includes("fixture")
    || normalized.includes("mock")
    || normalized.includes("test")
    || normalized.includes("changeme")
    || normalized.includes("localhost")
    || normalized.startsWith("process.env")
    || normalized.startsWith("previous")
    || normalized.startsWith("original")
    || normalized.startsWith("your-")
    || normalized.startsWith("your_");
}

function redact(value: string) {
  if (value.length <= 8) return "[redacted]";
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

async function listFiles(root: string, directory = root): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const entryPath = path.join(directory, entry.name);
    if (isIgnoredPath(root, entryPath)) return [];
    if (entry.isDirectory()) return listFiles(root, entryPath);
    if (!entry.isFile()) return [];
    const info = await stat(entryPath);
    if (info.size > 1_000_000) return [];
    return [entryPath];
  }));
  return files.flat();
}

function scanContent(root: string, filePath: string, content: string) {
  const findings: Finding[] = [];
  const lines = content.split(/\r?\n/);
  lines.forEach((line, index) => {
    for (const { kind, pattern } of secretPatterns) {
      pattern.lastIndex = 0;
      for (const match of line.matchAll(pattern)) {
        const value = match[0];
        if (!isPlaceholder(value)) {
          findings.push({
            file: path.relative(root, filePath),
            line: index + 1,
            kind,
            preview: redact(value),
          });
        }
      }
    }

    assignmentPattern.lastIndex = 0;
    for (const match of line.matchAll(assignmentPattern)) {
      const value = match[1] ?? "";
      if (!isPlaceholder(value)) {
        findings.push({
          file: path.relative(root, filePath),
          line: index + 1,
          kind: "secret-like assignment",
          preview: redact(value),
        });
      }
    }
  });
  return findings;
}

async function main() {
  const root = process.cwd();
  const files = await listFiles(root);
  const findings: Finding[] = [];

  for (const file of files) {
    const content = await readFile(file, "utf8").catch(() => "");
    findings.push(...scanContent(root, file, content));
  }

  if (findings.length) {
    console.error("Secret audit failed. Redacted findings:");
    for (const finding of findings) {
      console.error(`${finding.file}:${finding.line} ${finding.kind} ${finding.preview}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(`Secret audit passed. Scanned ${files.length} text files.`);
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
