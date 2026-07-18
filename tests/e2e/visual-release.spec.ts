import { expect, test, type Page } from "@playwright/test";

const criticalViews = [
  { name: "home-mobile", path: "/", viewport: { width: 390, height: 760 } },
  { name: "home-desktop", path: "/", viewport: { width: 1440, height: 900 } },
  { name: "shop-mobile", path: "/shop", viewport: { width: 390, height: 760 } },
  { name: "shop-desktop", path: "/shop", viewport: { width: 1440, height: 900 } },
  { name: "pdp-mobile", path: "/product/flared-pants-7461?color=Nude&size=S", viewport: { width: 390, height: 760 } },
  { name: "pdp-desktop", path: "/product/flared-pants-7461?color=Nude&size=S", viewport: { width: 1440, height: 900 } },
] as const;

async function stabilizeVisuals(page: Page) {
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
  });
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0.001ms !important;
        animation-delay: 0ms !important;
        transition-duration: 0.001ms !important;
        scroll-behavior: auto !important;
      }

      [aria-label="Open Next.js Dev Tools"],
      nextjs-portal,
      [data-nextjs-devtools-button],
      [data-nextjs-dialog-overlay] {
        display: none !important;
      }
    `,
  });
}

async function waitForVisualAssets(page: Page) {
  await expect(page.locator("main").first()).toBeVisible();
  await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
  await page.evaluate(async () => {
    const imageWaits = Array.from(document.images)
      .filter((image) => {
        const box = image.getBoundingClientRect();
        const style = window.getComputedStyle(image);
        return box.width > 0
          && box.height > 0
          && box.top < window.innerHeight
          && box.bottom > 0
          && style.display !== "none"
          && style.visibility !== "hidden";
      })
      .map((image) => {
        if (image.complete && image.naturalWidth > 0) return Promise.resolve();
        return new Promise<void>((resolve) => {
          const timeout = window.setTimeout(resolve, 2_000);
          image.addEventListener("load", () => {
            window.clearTimeout(timeout);
            resolve();
          }, { once: true });
          image.addEventListener("error", () => {
            window.clearTimeout(timeout);
            resolve();
          }, { once: true });
        });
      });

    await Promise.all(
      Array.from(document.images)
        .filter((image) => image.loading !== "lazy" && image.getBoundingClientRect().top < window.innerHeight)
        .map((image) => image.decode?.().catch(() => undefined)),
    );
    await Promise.all(imageWaits);
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
}

test.describe("visual release gate", () => {
  for (const view of criticalViews) {
    test(`${view.name} first viewport matches release baseline`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "desktop-chromium", "Visual release snapshots run once with manual viewport coverage.");
      await page.setViewportSize(view.viewport);
      await stabilizeVisuals(page);
      await page.goto(view.path, { waitUntil: "domcontentloaded" });
      await waitForVisualAssets(page);

      await expect(page).toHaveScreenshot(`${view.name}.png`, {
        animations: "disabled",
        caret: "hide",
        fullPage: false,
        maxDiffPixelRatio: 0.02,
      });
    });
  }
});
