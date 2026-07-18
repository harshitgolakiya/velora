import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const sourceFiles = [
  "next.config.ts",
  "playwright.config.ts",
  "prisma.config.ts",
  "scripts",
  "src",
];

const allowedRuntimeEnv = new Set([
  "CI",
  "LAUNCH_READINESS_STRICT",
  "NEXT_PHASE",
  "NODE_ENV",
  "VERCEL_ENV",
  "VERCEL_GIT_COMMIT_SHA",
]);

const ignoredSourceMatches = [
  /node_modules/,
  /\.next/,
  /test-results/,
  /playwright-report/,
];

async function collectFiles(paths: string[]) {
  const { readdir, stat } = await import("node:fs/promises");
  const { join } = await import("node:path");
  const files: string[] = [];

  async function walk(pathname: string) {
    if (ignoredSourceMatches.some((pattern) => pattern.test(pathname))) return;
    const info = await stat(pathname).catch(() => null);
    if (!info) return;
    if (info.isDirectory()) {
      const entries = await readdir(pathname);
      await Promise.all(entries.map((entry) => walk(join(pathname, entry))));
      return;
    }
    if (info.isFile() && /\.(ts|tsx|js|mjs|cjs)$/.test(pathname)) files.push(pathname);
  }

  await Promise.all(paths.map(walk));
  return files;
}

function envNamesFromSource(content: string) {
  const names = new Set<string>();
  for (const match of content.matchAll(/process\.env\.([A-Z0-9_]+)/g)) {
    names.add(match[1]);
  }
  for (const match of content.matchAll(/process\.env\[['"]([A-Z0-9_]+)['"]\]/g)) {
    names.add(match[1]);
  }
  return names;
}

function envNamesFromExample(content: string) {
  const names = new Set<string>();
  for (const line of content.split(/\r?\n/)) {
    const match = /^([A-Z0-9_]+)\s*=/.exec(line.trim());
    if (match) names.add(match[1]);
  }
  return names;
}

export async function buildEnvInventoryReport() {
  const files = await collectFiles(sourceFiles);
  const used = new Set<string>();
  for (const file of files) {
    for (const name of envNamesFromSource(readFileSync(file, "utf8"))) used.add(name);
  }

  const documented = envNamesFromExample(readFileSync(".env.example", "utf8"));
  const missingFromExample = [...used]
    .filter((name) => !documented.has(name) && !allowedRuntimeEnv.has(name))
    .sort();
  const unusedInExample = [...documented]
    .filter((name) => !used.has(name) && !name.startsWith("SANITY_") && !name.startsWith("SHOPIFY_") && !name.startsWith("STRAPI_") && !["KLAVIYO_API_KEY", "MAILCHIMP_API_KEY"].includes(name))
    .sort();

  return {
    used: [...used].sort(),
    documented: [...documented].sort(),
    missingFromExample,
    unusedInExample,
  };
}

async function main() {
  const report = await buildEnvInventoryReport();
  if (report.missingFromExample.length) {
    console.error(`Env inventory failed. Missing from .env.example: ${report.missingFromExample.join(", ")}`);
    process.exitCode = 1;
    return;
  }

  console.log(`Env inventory passed. Documented ${report.documented.length} env vars; scanned ${report.used.length} used env vars.`);
  if (report.unusedInExample.length) {
    console.log(`Documented optional/provider env vars not directly read in code: ${report.unusedInExample.join(", ")}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main();
}
