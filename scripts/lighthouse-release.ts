import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright";

type ScoreKey = "performance" | "accessibility" | "best-practices" | "seo";

type AuditedRoute = {
  name: string;
  path: string;
  minScores: Record<ScoreKey, number>;
  targetScores: Record<ScoreKey, number>;
};

const targetScore = Number(process.env.LIGHTHOUSE_TARGET_SCORE ?? 0.9);
const defaultMinScore = Number(process.env.LIGHTHOUSE_MIN_SCORE ?? 0.9);

const routes: AuditedRoute[] = [
  { name: "home", path: "/", minScores: scores({ performance: 0.6 }), targetScores: scores({ performance: targetScore }, targetScore) },
  { name: "shop", path: "/shop", minScores: scores({ performance: 0.6 }), targetScores: scores({ performance: targetScore }, targetScore) },
  { name: "product", path: "/product/flared-pants-7461", minScores: scores({ performance: 0.6 }), targetScores: scores({ performance: targetScore }, targetScore) },
  {
    name: "cart",
    path: "/cart",
    minScores: scores({ performance: 0.85, seo: 0.6 }),
    targetScores: scores({ performance: targetScore, seo: 0.6 }, targetScore),
  },
];

function scores(overrides: Partial<Record<ScoreKey, number>>, base = defaultMinScore): Record<ScoreKey, number> {
  return {
    performance: overrides.performance ?? base,
    accessibility: overrides.accessibility ?? base,
    "best-practices": overrides["best-practices"] ?? base,
    seo: overrides.seo ?? base,
  };
}

function formatScore(value?: number | null) {
  return value == null ? "n/a" : String(Math.round(value * 100));
}

async function canReach(url: string) {
  try {
    const response = await fetch(url, { method: "HEAD", cache: "no-store" });
    return response.ok || response.status < 500;
  } catch {
    return false;
  }
}

async function waitForServer(url: string, timeoutMs = 120_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await canReach(url)) return;
    await delay(1_000);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function startProductionServer(port: number) {
  if (!existsSync(join(process.cwd(), ".next"))) {
    throw new Error("No .next build found. Run `npm run build` before `npm run test:lighthouse`.");
  }

  const child = spawn(
    "npm",
    ["run", "start", "--", "--hostname", "127.0.0.1", "--port", String(port)],
    {
      cwd: process.cwd(),
      env: { ...process.env, PORT: String(port) },
      shell: process.platform === "win32",
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  child.stdout.on("data", (chunk) => process.stdout.write(`[next:start] ${chunk}`));
  child.stderr.on("data", (chunk) => process.stderr.write(`[next:start] ${chunk}`));
  return child;
}

function stopProcess(child?: ChildProcess) {
  if (!child || child.killed) return;
  if (process.platform === "win32" && child.pid) {
    spawnSync("taskkill", ["/pid", String(child.pid), "/t", "/f"], { stdio: "ignore" });
    return;
  }
  child.kill(process.platform === "win32" ? undefined : "SIGTERM");
}

async function findFreeBaseUrl(startPort: number) {
  for (let offset = 0; offset < 20; offset += 1) {
    const port = startPort + offset;
    const baseUrl = `http://127.0.0.1:${port}`;
    if (!await canReach(baseUrl)) return { baseUrl, port };
  }
  throw new Error(`Could not find a free Lighthouse port starting at ${startPort}`);
}

async function runCommand(command: string, args: string[], env: NodeJS.ProcessEnv) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });
    child.stdout.on("data", (chunk) => process.stdout.write(chunk));
    child.stderr.on("data", (chunk) => process.stderr.write(chunk));
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} exited with ${code}`));
    });
  });
}

async function warmRoutes(baseUrl: string) {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 3,
      isMobile: true,
    });
    for (const route of routes) {
      const url = new URL(route.path, baseUrl).toString();
      await page.goto(url, { waitUntil: "networkidle", timeout: 45_000 }).catch(() => undefined);
    }
  } finally {
    await browser.close();
  }
}

async function resolveBaseUrl() {
  const configured = process.env.LIGHTHOUSE_BASE_URL?.replace(/\/$/, "");
  if (configured) {
    await waitForServer(configured);
    return { baseUrl: configured, server: undefined };
  }

  const { baseUrl, port } = await findFreeBaseUrl(Number(process.env.LIGHTHOUSE_PORT ?? 3001));
  const server = startProductionServer(port);
  await waitForServer(baseUrl);
  return { baseUrl, server };
}

async function run() {
  const { baseUrl, server } = await resolveBaseUrl();
  const outputDir = join(process.cwd(), "test-results", "lighthouse");
  mkdirSync(outputDir, { recursive: true });

  const failures: string[] = [];
  const targetMisses: string[] = [];
  const summary: Array<Record<string, string | number>> = [];
  const lighthouseCli = join(process.cwd(), "node_modules", "lighthouse", "cli", "index.js");

  try {
    await warmRoutes(baseUrl);

    for (const route of routes) {
      const url = new URL(route.path, baseUrl).toString();
      const outputPath = join(outputDir, `${route.name}.json`);
      await runCommand(process.execPath, [
        lighthouseCli,
        url,
        "--quiet",
        "--output=json",
        `--output-path=${outputPath}`,
        "--only-categories=performance,accessibility,best-practices,seo",
        "--form-factor=mobile",
        "--screenEmulation.mobile=true",
        "--screenEmulation.width=390",
        "--screenEmulation.height=844",
        "--screenEmulation.deviceScaleFactor=3",
        "--throttling-method=simulate",
        "--chrome-flags=--headless=new --disable-gpu --disable-dev-shm-usage --no-sandbox",
      ], { ...process.env, CHROME_PATH: chromium.executablePath() });

      const lhr = JSON.parse(readFileSync(outputPath, "utf8")) as {
        categories: Record<ScoreKey, { score?: number | null } | undefined>;
      };
      const row: Record<string, string | number> = { route: route.name, url };
      for (const key of Object.keys(route.minScores) as ScoreKey[]) {
        const actual = lhr.categories[key]?.score ?? null;
        const required = route.minScores[key];
        const target = route.targetScores[key];
        row[key] = formatScore(actual);
        if (actual == null || actual < required) {
          failures.push(`${route.name} ${key}: ${formatScore(actual)} < ${Math.round(required * 100)}`);
        }
        if (actual != null && actual < target) {
          targetMisses.push(`${route.name} ${key}: ${formatScore(actual)} < target ${Math.round(target * 100)}`);
        }
      }
      summary.push(row);
    }
  } finally {
    stopProcess(server);
  }

  console.table(summary);
  if (targetMisses.length) {
    console.warn(`Lighthouse target gaps:\n${targetMisses.map((failure) => `- ${failure}`).join("\n")}`);
  }
  if (failures.length) {
    throw new Error(`Lighthouse release gate failed:\n${failures.map((failure) => `- ${failure}`).join("\n")}`);
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exit(1);
});
