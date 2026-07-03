import { expect, test, type Page } from "@playwright/test";

async function stabilize(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("velora-theme", "light");
  });
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
}

test.describe("search results", () => {
  test("result pages preserve query URL state across reload and browser navigation", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "Search route-state coverage only needs the desktop project.");
    await page.setViewportSize({ width: 1440, height: 1000 });
    await stabilize(page);

    await page.goto("/search?q=flared", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: /Results for .flared./i })).toBeVisible();
    await expect(page.getByRole("link", { name: "Flared Pants", exact: true })).toBeVisible();

    await page.reload({ waitUntil: "networkidle" });
    await expect(page).toHaveURL(/\/search\?q=flared/);
    await expect(page.getByRole("link", { name: "Flared Pants", exact: true })).toBeVisible();

    await page.getByRole("link", { name: "Flared Pants", exact: true }).click();
    await expect(page).toHaveURL(/\/product\/flared-pants-7461/);
    await page.goBack({ waitUntil: "networkidle" });
    await expect(page).toHaveURL(/\/search\?q=flared/);
    await expect(page.getByRole("link", { name: "Flared Pants", exact: true })).toBeVisible();
  });

  test("zero-result searches show recovery destinations", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "Zero-result search coverage only needs the desktop project.");
    await page.setViewportSize({ width: 390, height: 760 });
    await stabilize(page);

    await page.goto("/search?q=zzzznotfound", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: "No products found" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Shop all" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Leggings" })).toBeVisible();
  });
});
