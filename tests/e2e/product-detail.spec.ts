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
  test("shows category-specific fit guidance for demo apparel products", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "PDP smoke coverage only needs the desktop project.");
    await page.setViewportSize({ width: 1440, height: 1000 });
    await stabilize(page);

    await page.goto("/product/noir-column-gown", { waitUntil: "networkidle" });

    await expect(page.getByRole("heading", { name: "Noir Column Gown" })).toBeVisible();
    await expect(page.locator("[data-product-summary]")).toBeVisible();
    await expect(page.locator("[data-product-summary]")).toHaveCSS("font-size", "18px");
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
    await expect(page.getByRole("tab", { name: "Size & Fit" })).toBeVisible();
    const productInfo = page.getByRole("region", { name: "Product information" });
    await expect(productInfo.getByText("Key fit notes")).toBeVisible();
    await expect(productInfo.getByText(/drape|structure|fit|ease/i).first()).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.getByRole("button", { name: /open media gallery for noir column gown/i }).click();
    await expect(page.getByRole("dialog", { name: "Noir Column Gown full-screen image" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Zoom in" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(productInfo.getByText(/drape|structure|fit|ease/i).first()).toBeVisible();
  });

  test("explains unavailable selected variants and suggests recovery", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "PDP variant recovery coverage only needs the desktop project.");
    await page.setViewportSize({ width: 1440, height: 1000 });
    await stabilize(page);

    await page.goto("/product/noir-column-gown?color=Black&size=XXL", { waitUntil: "networkidle" });

    await expect(page.getByText("Size XXL is not available in Black.")).toBeVisible();
    await expect(page.getByText("Available in this color:")).toBeVisible();
    await expect(page.getByRole("button", { name: "Select available size S" })).toBeVisible();
  });

  test("handles sale prices and apparel sizing", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "PDP edge-case coverage only needs the desktop project.");
    await page.setViewportSize({ width: 1440, height: 1000 });
    await stabilize(page);

    await page.goto("/product/faux-leather-moto-jacket", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: "Faux Leather Moto Jacket" })).toBeVisible();
    await expect(page.getByText("AED 315").first()).toBeVisible();

    await page.goto("/product/corset-leather-skirt-set", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: "Corset Leather Skirt Set" })).toBeVisible();
    await expect(page.getByRole("button", { name: "S", exact: true })).toBeVisible();
  });

  test("keeps mobile purchase controls reachable with selected variant context", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile-chromium", "Mobile purchase bar only needs mobile coverage.");
    await stabilize(page);

    await page.goto("/product/noir-column-gown?color=Black&size=S", { waitUntil: "networkidle" });
    await expect(page.locator("[data-product-summary]")).toHaveCSS("font-size", "16px");
    await page.evaluate(() => window.scrollTo(0, 760));

    const mobileSummary = page.getByLabel("Mobile purchase summary");
    await expect(mobileSummary).toBeVisible();
    await expect(mobileSummary.getByRole("button", { name: /Noir Column Gown Black \/ S/ })).toBeVisible();
    await expect(mobileSummary.getByText("AED 520")).toBeVisible();
    await expect(mobileSummary.getByRole("button", { name: "Add to bag" })).toBeVisible();

    await page.getByRole("button", { name: "M", exact: true }).click();
    await expect(mobileSummary.getByRole("button", { name: /Noir Column Gown Black \/ M/ })).toBeVisible();
  });

  test("renders PDP gallery images cleanly across light and dark themes", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "Visual image-quality coverage only needs desktop.");
    await page.setViewportSize({ width: 1440, height: 1000 });

    for (const theme of ["light", "dark"] as const) {
      await setTheme(page, theme);
      await page.goto("/product/noir-column-gown", { waitUntil: "networkidle" });
      await expectLoadedProductImage(page, /Noir Column Gown/i);
      await page.getByRole("button", { name: /open media gallery for noir column gown/i }).click();
      await expect(page.getByRole("dialog", { name: "Noir Column Gown full-screen image" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Zoom in" })).toBeVisible();
      await page.keyboard.press("Escape");

      await page.goto("/product/corset-leather-skirt-set", { waitUntil: "networkidle" });
      await expectLoadedProductImage(page, /Corset Leather Skirt Set/i);
    }
  });
});
