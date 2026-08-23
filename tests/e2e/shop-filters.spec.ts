import { expect, test, type Page } from "@playwright/test";

async function stabilize(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("velora-theme", "light");
  });
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
}

test.describe("shop filters with imported catalog data", () => {
  test("category, color, and size filters update URL state and survive reload", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "Filter integration coverage only needs the desktop project.");
    await page.setViewportSize({ width: 1440, height: 1000 });
    await stabilize(page);

    await page.goto("/shop?category=Dresses", { waitUntil: "networkidle" });
    await expect(page.getByRole("link", { name: "Noir Column Gown", exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Color" }).click();
    await page.getByLabel("Color filter options").getByRole("button", { name: "Black" }).click();
    await expect(page).toHaveURL(/category=Dresses/);
    await expect(page).toHaveURL(/color=Black/);

    await page.getByRole("button", { name: "Size" }).click();
    await page.getByLabel("Size filter options").getByRole("button", { name: "M" }).click();
    await expect(page).toHaveURL(/size=M/);
    await expect(page.getByRole("link", { name: "Noir Column Gown", exact: true })).toBeVisible();

    await page.reload({ waitUntil: "networkidle" });
    await expect(page).toHaveURL(/category=Dresses/);
    await expect(page).toHaveURL(/color=Black/);
    await expect(page).toHaveURL(/size=M/);
    await expect(page.getByRole("link", { name: "Noir Column Gown", exact: true })).toBeVisible();
  });

  test("empty filter combinations expose removable chips and reset recovery", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "Filter recovery coverage only needs the desktop project.");
    await page.setViewportSize({ width: 390, height: 760 });
    await stabilize(page);

    await page.goto("/shop?category=Dresses&color=Invisible%20Sample", { waitUntil: "networkidle" });

    await expect(page.getByText("No products match these filters")).toBeVisible();
    await expect(page.getByRole("button", { name: /Invisible Sample/i }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Reset filters/i })).toBeVisible();

    await page.getByRole("button", { name: /Invisible Sample/i }).last().click();
    await expect(page).not.toHaveURL(/color=Invisible/);
  });
});
