import { expect, test } from "@playwright/test";

const contentPages = ["/story", "/fabric-guide", "/faqs", "/shipping", "/returns", "/privacy", "/terms", "/size-guide", "/care-guide", "/contact"];

for (const path of contentPages) {
  test(`${path} renders without horizontal overflow`, async ({ page }) => {
    await page.goto(path, { waitUntil: "networkidle" });
    await expect(page.locator("main, section").first()).toBeVisible();
    const dimensions = await page.evaluate(() => ({ viewport: window.innerWidth, document: document.documentElement.scrollWidth }));
    expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport + 1);
    const heading = page.locator("h1").first();
    await expect(heading).toBeVisible();
    const box = await heading.boundingBox();
    expect(box?.width ?? 0).toBeGreaterThan(0);
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(dimensions.viewport + 1);
  });
}

test("FAQ search and contact validation controls are usable", async ({ page }) => {
  await page.goto("/faqs");
  await page.getByLabel("Search frequently asked questions").fill("exchange size");
  await expect(page.getByText(/answer/).first()).toBeVisible();
  await page.goto("/contact");
  await expect(page.getByLabel("Name")).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Email", exact: true })).toBeVisible();
  await expect(page.getByLabel("How can we help?")).toBeVisible();
});

test("admin can preview managed content without publishing changes", async ({ page }) => {
  await page.goto("/admin-login?callbackUrl=/admin/content");
  await page.getByLabel("Email address").fill(process.env.E2E_ADMIN_EMAIL ?? "admin@velora.ae");
  await page.locator('input[name="password"]').fill(process.env.E2E_ADMIN_PASSWORD ?? "VeloraAdmin123!");
  await page.getByRole("button", { name: "Sign in securely" }).click();
  await page.waitForURL((url) => url.pathname === "/admin/content");

  const response = await page.request.get("/api/admin/pages");
  expect(response.ok()).toBe(true);
  const payload = await response.json() as { pages: Array<{ id: string }> };
  expect(payload.pages.length).toBeGreaterThan(0);
  await page.goto(`/admin/content/${payload.pages[0].id}/preview`);
  await expect(page.getByText(/Preview ·/)).toBeVisible();
  await expect(page.locator("h1, h2").first()).toBeVisible();
});
