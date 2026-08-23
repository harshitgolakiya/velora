import { expect, test, type Page } from "@playwright/test";

type ThrottledVitals = {
  cls: number;
  interactionStart: number;
  lcp: number;
  maxInteraction: number;
};

type LayoutShiftEntry = PerformanceEntry & {
  hadRecentInput: boolean;
  value: number;
};

type EventTimingEntry = PerformanceEntry & {
  duration: number;
};

const routes = [
  { path: "/", name: "home", maxLcp: 18_000, maxCls: 0.1, maxInteraction: 500 },
  { path: "/shop", name: "shop", maxLcp: 18_000, maxCls: 0.1, maxInteraction: 500 },
  { path: "/product/airlift-full-length-legging", name: "product", maxLcp: 18_000, maxCls: 0.1, maxInteraction: 2_500 },
] as const;

async function emulateThrottledMobile(page: Page) {
  const client = await page.context().newCDPSession(page);
  await client.send("Network.enable");
  await client.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 150,
    downloadThroughput: (1.6 * 1024 * 1024) / 8,
    uploadThroughput: (750 * 1024) / 8,
    connectionType: "cellular3g",
  });
  await client.send("Emulation.setCPUThrottlingRate", { rate: 4 });
}

async function prepareThrottledRun(page: Page) {
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

    const pageWindow = window as typeof window & { __veloraThrottledVitals?: ThrottledVitals };
    pageWindow.__veloraThrottledVitals = { cls: 0, interactionStart: 0, lcp: 0, maxInteraction: 0 };

    try {
      new PerformanceObserver((list) => {
        const latest = list.getEntries().at(-1);
        const observedWindow = window as typeof window & { __veloraThrottledVitals?: ThrottledVitals };
        if (latest && observedWindow.__veloraThrottledVitals) {
          observedWindow.__veloraThrottledVitals.lcp = latest.startTime;
        }
      }).observe({ type: "largest-contentful-paint", buffered: true });
    } catch {
      pageWindow.__veloraThrottledVitals!.lcp = 0;
    }

    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const shift = entry as LayoutShiftEntry;
          const observedWindow = window as typeof window & { __veloraThrottledVitals?: ThrottledVitals };
          if (!shift.hadRecentInput && observedWindow.__veloraThrottledVitals) {
            observedWindow.__veloraThrottledVitals.cls += shift.value;
          }
        }
      }).observe({ type: "layout-shift", buffered: true });
    } catch {
      pageWindow.__veloraThrottledVitals!.cls = 0;
    }

    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const event = entry as EventTimingEntry;
          const observedWindow = window as typeof window & { __veloraThrottledVitals?: ThrottledVitals };
          if (observedWindow.__veloraThrottledVitals && event.startTime >= observedWindow.__veloraThrottledVitals.interactionStart) {
            observedWindow.__veloraThrottledVitals.maxInteraction = Math.max(
              observedWindow.__veloraThrottledVitals.maxInteraction,
              event.duration,
            );
          }
        }
      }).observe({ type: "event", buffered: true, durationThreshold: 16 } as PerformanceObserverInit & {
        durationThreshold: number;
      });
    } catch {
      pageWindow.__veloraThrottledVitals!.maxInteraction = 0;
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

async function resetInteractionMetrics(page: Page) {
  await page.evaluate(() => {
    const pageWindow = window as typeof window & { __veloraThrottledVitals?: ThrottledVitals };
    if (pageWindow.__veloraThrottledVitals) {
      pageWindow.__veloraThrottledVitals.interactionStart = performance.now();
      pageWindow.__veloraThrottledVitals.maxInteraction = 0;
    }
  });
}

async function collectMetrics(page: Page) {
  return page.evaluate(async () => {
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    const resources = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
    const transferKb = resources.reduce((sum, entry) => sum + entry.transferSize, 0) / 1024;
    const scriptTransferKb = resources
      .filter((entry) => entry.initiatorType === "script")
      .reduce((sum, entry) => sum + entry.transferSize, 0) / 1024;
    const pageWindow = window as typeof window & { __veloraThrottledVitals?: ThrottledVitals };
    const vitals = pageWindow.__veloraThrottledVitals ?? { cls: 0, interactionStart: 0, lcp: 0, maxInteraction: 0 };

    return {
      cls: vitals.cls,
      domContentLoaded: nav ? nav.domContentLoadedEventEnd - nav.startTime : 0,
      lcp: vitals.lcp,
      load: nav ? nav.loadEventEnd - nav.startTime : 0,
      maxInteraction: vitals.maxInteraction,
      scriptTransferKb,
      transferKb,
      ttfb: nav ? nav.responseStart - nav.requestStart : 0,
    };
  });
}

test.describe("throttled mobile performance", () => {
  test.setTimeout(90_000);

  for (const route of routes) {
    test(`${route.name} keeps core vitals inside throttled mobile budgets`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "mobile-chromium", "Throttled mobile performance runs once on Chromium mobile.");
      await warmRoute(page, route.path);
      await emulateThrottledMobile(page);
      await prepareThrottledRun(page);
      await page.goto(route.path, { waitUntil: "domcontentloaded", timeout: 60_000 });
      await page.waitForLoadState("load", { timeout: 60_000 }).catch(() => undefined);
      await page.waitForFunction(
        () => ((window as typeof window & { __veloraThrottledVitals?: ThrottledVitals }).__veloraThrottledVitals?.lcp ?? 0) > 0,
        null,
        { timeout: 30_000 },
      );
      await resetInteractionMetrics(page);
      await page.tap("body");
      await page.waitForTimeout(250);

      const metrics = await collectMetrics(page);
      const frameLatency = await interactionFrameLatency(page);
      await testInfo.attach(`${route.name}-throttled-performance.json`, {
        body: JSON.stringify({ ...metrics, frameLatency }, null, 2),
        contentType: "application/json",
      });

      expect(metrics.ttfb).toBeLessThanOrEqual(4_500);
      expect(metrics.domContentLoaded).toBeLessThanOrEqual(18_000);
      expect(metrics.lcp).toBeLessThanOrEqual(route.maxLcp);
      expect(metrics.cls).toBeLessThanOrEqual(route.maxCls);
      expect(metrics.scriptTransferKb).toBeLessThanOrEqual(4_000);
      expect(metrics.maxInteraction).toBeLessThanOrEqual(route.maxInteraction);
      expect(frameLatency).toBeLessThanOrEqual(650);
    });
  }
});
