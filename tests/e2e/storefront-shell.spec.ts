import { expect, test } from "@playwright/test";

const auditViewports = [360, 390, 768, 1024, 1366, 1440, 1920];

async function stabilizeShell(page: import("@playwright/test").Page) {
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  await page.evaluate(() => {
    document.documentElement.dataset.theme = "light";
    localStorage.setItem("velora-theme", "light");
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
    `,
  });
}

test.describe("storefront shell responsive audit", () => {
  for (const width of auditViewports) {
    test(`header and footer stay stable at ${width}px`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "desktop-chromium", "Manual viewport coverage only needs one browser project.");
      await page.setViewportSize({ width, height: width < 768 ? 760 : 900 });
      await page.addInitScript(() => {
        localStorage.setItem("velora-theme", "light");
        localStorage.setItem("velora-consent-v1", JSON.stringify({
          necessary: true,
          analytics: false,
          marketing: false,
          preferences: false,
          updatedAt: "2026-01-01T00:00:00.000Z",
        }));
      });
      await page.goto("/shop", { waitUntil: "domcontentloaded" });
      await stabilizeShell(page);

      await expect(page.locator("header")).toBeVisible();
      const storefrontFooter = page.getByRole("contentinfo");
      await expect(storefrontFooter).toBeVisible();

      const dimensions = await page.evaluate(() => ({
        viewport: window.innerWidth,
        document: document.documentElement.scrollWidth,
      }));
      expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport + 1);

      const headerBox = await page.locator("header").boundingBox();
      expect(headerBox?.x ?? 0).toBeGreaterThanOrEqual(-1);
      expect((headerBox?.x ?? 0) + (headerBox?.width ?? 0)).toBeLessThanOrEqual(width + 1);

      await expect(page.locator("header")).toHaveScreenshot(`storefront-header-${width}.png`, {
        animations: "disabled",
        caret: "hide",
        maxDiffPixels: 1200,
      });
      await storefrontFooter.scrollIntoViewIfNeeded();
      await expect(storefrontFooter).toHaveScreenshot(`storefront-footer-${width}.png`, {
        animations: "disabled",
        caret: "hide",
        maxDiffPixels: 1200,
      });
    });
  }
});

test("mobile menu traps focus and closes with escape", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Manual mobile viewport coverage only needs one browser project.");
  await page.setViewportSize({ width: 390, height: 760 });
  await page.addInitScript(() => {
    localStorage.setItem("velora-theme", "light");
  });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await stabilizeShell(page);

  await page.getByRole("button", { name: "Open menu" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  const scrollLocked = await page.evaluate(() =>
    document.body.hasAttribute("data-scroll-locked")
    || getComputedStyle(document.body).overflow === "hidden"
    || getComputedStyle(document.documentElement).overflow === "hidden",
  );
  expect(scrollLocked).toBe(true);

  for (let index = 0; index < 8; index += 1) {
    await page.keyboard.press("Tab");
    const focusInsideDialog = await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]');
      return Boolean(dialog?.contains(document.activeElement));
    });
    expect(focusInsideDialog).toBe(true);
  }

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("mobile menu shortcuts open search and cart without stale drawer state", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Manual mobile viewport coverage only needs one browser project.");
  await page.setViewportSize({ width: 390, height: 760 });
  await page.addInitScript(() => {
    localStorage.setItem("velora-theme", "light");
  });
  await page.goto("/shop", { waitUntil: "domcontentloaded" });
  await stabilizeShell(page);

  await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Search" }).click();
  await expect(page.getByRole("dialog", { name: "Search products and collections" })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Search products" })).toBeFocused();
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Cart" }).click();
  await expect(page.getByRole("dialog", { name: "Your Bag" })).toBeVisible();
});

test("search dialog focuses input and returns focus when closed", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Shared dialog coverage only needs one browser project.");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.addInitScript(() => {
    localStorage.setItem("velora-theme", "light");
  });
  await page.goto("/shop", { waitUntil: "domcontentloaded" });
  await stabilizeShell(page);

  const trigger = page.getByRole("button", { name: "Search" });
  await trigger.click();
  await expect(page.getByRole("dialog", { name: "Search products and collections" })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Search products" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Search products and collections" })).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("quick view dialog opens from product cards and closes with escape", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Shared dialog coverage only needs one browser project.");
  await page.setViewportSize({ width: 390, height: 760 });
  await page.addInitScript(() => {
    localStorage.setItem("velora-theme", "light");
  });
  await page.goto("/shop", { waitUntil: "domcontentloaded" });
  await stabilizeShell(page);

  const trigger = page.getByRole("button", { name: /Quick view/i }).first();
  await trigger.click();
  const dialog = page.getByRole("dialog").filter({ has: page.getByRole("button", { name: "Add to bag" }) });
  await expect(dialog).toBeVisible();

  const dimensions = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
  }));
  expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport + 1);

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("newsletter dialog traps focus and respects escape dismissal", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Newsletter modal timing coverage only needs one browser project.");
  await page.setViewportSize({ width: 390, height: 760 });
  await page.addInitScript(() => {
    localStorage.setItem("velora-theme", "light");
    localStorage.removeItem("velora-newsletter");
  });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await stabilizeShell(page);

  const dialog = page.getByRole("dialog", { name: "Join the Velora newsletter" });
  await expect(dialog).toBeVisible({ timeout: 10000 });

  for (let index = 0; index < 4; index += 1) {
    await page.keyboard.press("Tab");
    const focusInsideDialog = await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"][data-state="open"]');
      return Boolean(dialog?.contains(document.activeElement));
    });
    expect(focusInsideDialog).toBe(true);
  }

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("refresh and browser navigation preserve shell layout and route state", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Shared shell state coverage only needs one browser project.");
  await page.setViewportSize({ width: 390, height: 760 });
  await page.addInitScript(() => {
    localStorage.setItem("velora-theme", "light");
  });
  await page.goto("/shop?category=Leggings", { waitUntil: "domcontentloaded" });
  await stabilizeShell(page);

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/shop\?category=Leggings/);
  await expect(page.locator("header")).toBeVisible();
  await expect(page.getByRole("button", { name: "Open menu" })).toBeVisible();
  let dimensions = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
  }));
  expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport + 1);

  await page.goto("/collections/studio-sculpt", { waitUntil: "domcontentloaded" });
  await page.goBack({ waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/shop\?category=Leggings/);
  await expect(page.locator("header")).toBeVisible();
  dimensions = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
  }));
  expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport + 1);
});
