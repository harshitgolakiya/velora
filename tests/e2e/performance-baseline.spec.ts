import { expect, test, type Page } from "@playwright/test";

declare global {
  interface Window {
    __veloraVitals?: {
      cls: number;
      lcp: number;
    };
  }
}

type LayoutShiftEntry = PerformanceEntry & {
  hadRecentInput: boolean;
  value: number;
};

const routes = [
  { path: "/", name: "home", maxLcp: 6_500, maxTransferKb: 9_000, maxTtfb: 2_000 },
  { path: "/shop", name: "shop", maxLcp: 7_000, maxTransferKb: 10_000, maxTtfb: 2_500 },
  { path: "/product/airlift-full-length-legging", name: "product", maxLcp: 7_000, maxTransferKb: 10_000, maxTtfb: 3_000 },
  { path: "/cart", name: "cart", maxLcp: 5_500, maxTransferKb: 7_000, maxTtfb: 2_000 },
] as const;

async function preparePerformanceRun(page: Page) {
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  await page.addInitScript(() => {
    localStorage.setItem("velora-theme", "light");
    localStorage.setItem("velora-newsletter", "dismissed");
    localStorage.setItem("velora-consent-v1", JSON.stringify({
      necessary: true,
      analytics: false,
      marketing: false,
      preferences: false,
      updatedAt: "2026-01-01T00:00:00.000Z",
    }));
    window.__veloraVitals = { cls: 0, lcp: 0 };

    try {
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const latest = entries.at(-1);
        if (latest) window.__veloraVitals!.lcp = latest.startTime;
      }).observe({ type: "largest-contentful-paint", buffered: true });
    } catch {
      window.__veloraVitals.lcp = 0;
    }

    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const shift = entry as LayoutShiftEntry;
          if (!shift.hadRecentInput) {
            window.__veloraVitals!.cls += shift.value;
          }
        }
      }).observe({ type: "layout-shift", buffered: true });
    } catch {
      window.__veloraVitals.cls = 0;
    }
  });
}

async function warmRoute(page: Page, path: string) {
  const response = await page.request.get(path);
  expect(response.status()).toBeLessThan(500);
}

async function interactionFrameLatency(page: Page) {
  return page.evaluate(() =>
    new Promise<number>((resolve) => {
      const start = performance.now();
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve(performance.now() - start));
      });
    }),
  );
}

async function collectMetrics(page: Page) {
  return page.evaluate(async () => {
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    const resources = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
    const transferKb = resources.reduce((sum, entry) => sum + entry.transferSize, 0) / 1024;
    const imageRequests = resources.filter((entry) => entry.initiatorType === "img").length;
    const scriptTransferKb = resources
      .filter((entry) => entry.initiatorType === "script")
      .reduce((sum, entry) => sum + entry.transferSize, 0) / 1024;

    return {
      cls: window.__veloraVitals?.cls ?? 0,
      domContentLoaded: nav ? nav.domContentLoadedEventEnd - nav.startTime : 0,
      imageRequests,
      lcp: window.__veloraVitals?.lcp ?? 0,
      load: nav ? nav.loadEventEnd - nav.startTime : 0,
      scriptTransferKb,
      transferKb,
      ttfb: nav ? nav.responseStart - nav.requestStart : 0,
    };
  });
}

test.describe("mobile performance baseline", () => {
  for (const route of routes) {
    test(`${route.name} stays within mobile performance budgets`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "mobile-chromium", "Mobile performance gate runs once on the mobile browser profile.");
      await warmRoute(page, route.path);
      await preparePerformanceRun(page);
      await page.goto(route.path, { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle");

      const metrics = await collectMetrics(page);
      const interactionLatency = await interactionFrameLatency(page);
      await testInfo.attach(`${route.name}-performance.json`, {
        body: JSON.stringify({ ...metrics, interactionLatency }, null, 2),
        contentType: "application/json",
      });

      expect(metrics.ttfb).toBeLessThanOrEqual(route.maxTtfb);
      expect(metrics.domContentLoaded).toBeLessThanOrEqual(6_000);
      expect(metrics.load).toBeLessThanOrEqual(9_000);
      expect(metrics.lcp).toBeGreaterThan(0);
      expect(metrics.lcp).toBeLessThanOrEqual(route.maxLcp);
      expect(metrics.cls).toBeLessThanOrEqual(0.1);
      expect(metrics.transferKb).toBeLessThanOrEqual(route.maxTransferKb);
      expect(metrics.scriptTransferKb).toBeLessThanOrEqual(4_000);
      expect(interactionLatency).toBeLessThanOrEqual(250);
    });
  }
});
