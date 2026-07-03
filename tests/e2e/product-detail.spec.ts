import { expect, test, type Page } from "@playwright/test";

async function stabilize(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("velora-theme", "light");
  });
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
}

async function setTheme(page: Page, theme: "light" | "dark") {
  await page.addInitScript((value) => {
    localStorage.setItem("velora-theme", value);
  }, theme);
  await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
}

async function expectLoadedProductImage(page: Page, name: RegExp) {
  const image = page.getByRole("img", { name }).first();
  await expect(image).toBeVisible();
  await expect
    .poll(async () =>
      image.evaluate((node) => {
        const img = node as HTMLImageElement;
        return img.complete && img.naturalWidth > 200 && img.naturalHeight > 200;
      }),
    )
    .toBe(true);
}

test.describe("product detail", () => {
  test("shows category-specific fit guidance for imported products", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "PDP smoke coverage only needs the desktop project.");
    await page.setViewportSize({ width: 1440, height: 1000 });
    await stabilize(page);

    await page.goto("/product/flared-pants-7461", { waitUntil: "networkidle" });

    await expect(page.getByRole("heading", { name: "Flared Pants" })).toBeVisible();
    await expect(page.getByText("Fit guidance")).toBeVisible();
    await expect(page.getByText(/second-skin compression/i).first()).toBeVisible();
    await page.getByRole("button", { name: "Open full-screen image" }).click();
    await expect(page.getByRole("dialog", { name: "Flared Pants full-screen image" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Zoom in" })).toBeVisible();
    await page.keyboard.press("Escape");
    await page.getByRole("tab", { name: "Size & Fit" }).click();
    await expect(page.getByText("Key fit notes")).toBeVisible();
    await expect(page.getByText("High-rise waistband")).toBeVisible();
  });

  test("explains unavailable selected variants and suggests recovery", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "PDP variant recovery coverage only needs the desktop project.");
    await page.setViewportSize({ width: 1440, height: 1000 });
    await stabilize(page);

    await page.goto("/product/flared-pants-7461?color=Nude&size=XS", { waitUntil: "networkidle" });

    await expect(page.getByText("Size XS is not available in Nude.")).toBeVisible();
    await expect(page.getByText("Available in this color:")).toBeVisible();
    await expect(page.getByRole("button", { name: "Select available size S" })).toBeVisible();
  });

  test("handles sale prices and one-size imported products", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "PDP edge-case coverage only needs the desktop project.");
    await page.setViewportSize({ width: 1440, height: 1000 });
    await stabilize(page);

    await page.goto("/product/mira-wrap-jacket", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: "Mira Wrap Jacket" })).toBeVisible();
    await expect(page.getByText("AED 365").first()).toBeVisible();
    await expect(page.getByText("AED 420").first()).toBeVisible();

    await page.goto("/product/cc-a-bottle-blue-8856", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: "ccéa bottle blue" })).toBeVisible();
    await expect(page.getByRole("button", { name: "One size", exact: true })).toBeVisible();
  });

  test("keeps mobile purchase controls reachable with selected variant context", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile-chromium", "Mobile purchase bar only needs mobile coverage.");
    await stabilize(page);

    await page.goto("/product/flared-pants-7461?color=Nude&size=S", { waitUntil: "networkidle" });

    const mobileSummary = page.getByLabel("Mobile purchase summary");
    await expect(mobileSummary).toBeVisible();
    await expect(mobileSummary.getByRole("button", { name: /Flared Pants Nude \/ S/ })).toBeVisible();
    await expect(mobileSummary.getByText("AED 219")).toBeVisible();
    await expect(mobileSummary.getByRole("button", { name: "Add to bag" })).toBeVisible();

    await page.getByRole("button", { name: "M", exact: true }).click();
    await expect(mobileSummary.getByRole("button", { name: /Flared Pants Nude \/ M/ })).toBeVisible();
  });

  test("renders PDP gallery images cleanly across light and dark themes", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "Visual image-quality coverage only needs desktop.");
    await page.setViewportSize({ width: 1440, height: 1000 });

    for (const theme of ["light", "dark"] as const) {
      await setTheme(page, theme);
      await page.goto("/product/flared-pants-7461", { waitUntil: "networkidle" });
      await expectLoadedProductImage(page, /Flared Pants/i);
      await page.getByRole("button", { name: "Open full-screen image" }).click();
      await expect(page.getByRole("dialog", { name: "Flared Pants full-screen image" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Zoom in" })).toBeVisible();
      await page.keyboard.press("Escape");

      await page.goto("/product/cc-a-bottle-blue-8856", { waitUntil: "networkidle" });
      await expectLoadedProductImage(page, /ccéa bottle blue/i);
    }
  });
});
