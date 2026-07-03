import { expect, test, type Page } from "@playwright/test";

async function stabilize(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("velora-theme", "light");
    localStorage.setItem(
      "velora-consent",
      JSON.stringify({
        necessary: true,
        analytics: false,
        marketing: false,
        preferences: false,
        updatedAt: "2026-06-28T00:00:00.000Z",
      }),
    );
  });
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
}

async function railMetrics(page: Page, railTestId: string) {
  return page.getByTestId(railTestId).locator(".homepage-product-grid").evaluate((viewport) => {
    const viewportBox = viewport.getBoundingClientRect();
    const slides = Array.from(viewport.querySelectorAll(".homepage-product-slide"));
    const itemBoxes = slides
      .slice(0, 8)
      .map((item) => item.getBoundingClientRect());

    return {
      childCount: slides.length,
      fullyVisible: itemBoxes.filter((box) => box.left >= viewportBox.left - 1 && box.right <= viewportBox.right + 1).length,
      scrollWidth: viewport.scrollWidth,
      clientWidth: viewport.clientWidth,
    };
  });
}

test.describe("homepage merchandising", () => {
  test("orders homepage sections around spotlight and product sliders", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "Homepage desktop layout assertions only need the desktop project.");
    await page.setViewportSize({ width: 1440, height: 1200 });
    await stabilize(page);

    await page.goto("/", { waitUntil: "networkidle" });

    await expect(page.getByRole("heading", { name: /sculpted essentials/i })).toBeVisible();
    await expect(page.getByTestId("home-category-media")).toBeVisible();
    await expect(page.getByTestId("home-spotlight-banner")).toBeVisible();
    await expect(page.getByTestId("home-product-rail-home-new-collection-slider")).toBeVisible();
    await expect(page.getByText("Collections in focus").first()).toBeVisible();
    await expect(page.getByTestId("home-product-rail-home-best-sellers-slider")).toBeVisible();

    const order = await page.evaluate(() =>
      [
        "home-category-media",
        "home-spotlight",
        "home-product-rail-home-new-collection-slider",
        "home-product-rail-home-best-sellers-slider",
      ].map((id) => document.querySelector(`[data-testid="${id}"]`)?.getBoundingClientRect().top ?? -1),
    );

    expect(order[0]).toBeLessThan(order[1]);
    expect(order[1]).toBeLessThan(order[2]);
    expect(order[2]).toBeLessThan(order[3]);
  });

  test("spotlight banner is full bleed like the hero", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "Full-bleed desktop assertion only needs the desktop project.");
    await page.setViewportSize({ width: 1440, height: 1200 });
    await stabilize(page);

    await page.goto("/", { waitUntil: "networkidle" });
    const box = await page.getByTestId("home-spotlight-banner").boundingBox();

    expect(Math.round(box?.x ?? -1)).toBe(0);
    expect(Math.round(box?.width ?? 0)).toBe(1440);
  });

  test("crop-sensitive homepage media keeps stable visual proportions", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "Visual proportion coverage only needs the desktop project.");
    await page.setViewportSize({ width: 1440, height: 1200 });
    await stabilize(page);

    await page.goto("/", { waitUntil: "networkidle" });

    const categoryTile = await page.getByTestId("home-category-media").locator(".homepage-media-grid > a").first().boundingBox();
    expect(categoryTile).not.toBeNull();
    expect((categoryTile?.width ?? 0) / (categoryTile?.height ?? 1)).toBeCloseTo(3 / 4.45, 1);

    const collectionFrame = await page.getByTestId("home-collection-story").locator(".homepage-collection-story-frame").first().boundingBox();
    expect(collectionFrame).not.toBeNull();
    expect((collectionFrame?.width ?? 0) / (collectionFrame?.height ?? 1)).toBeCloseTo(16 / 10, 1);
  });

  test("product sliders show four cards at laptop and five at wide desktop", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "Manual viewport coverage only needs the desktop project.");
    await stabilize(page);

    await page.setViewportSize({ width: 1440, height: 1200 });
    await page.goto("/", { waitUntil: "networkidle" });
    let metrics = await railMetrics(page, "home-product-rail-home-new-collection-slider");
    expect(metrics.childCount).toBeGreaterThan(5);
    expect(metrics.fullyVisible).toBe(4);
    expect(metrics.scrollWidth).toBeGreaterThan(metrics.clientWidth);

    await page.setViewportSize({ width: 1920, height: 1200 });
    await page.reload({ waitUntil: "networkidle" });
    metrics = await railMetrics(page, "home-product-rail-home-new-collection-slider");
    expect(metrics.childCount).toBeGreaterThan(5);
    expect(metrics.fullyVisible).toBe(5);
    expect(metrics.scrollWidth).toBeGreaterThan(metrics.clientWidth);
  });

  test("product sliders can be dragged without opening a product", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "Drag behavior coverage only needs the desktop project.");
    await page.setViewportSize({ width: 1440, height: 1200 });
    await stabilize(page);

    await page.goto("/", { waitUntil: "networkidle" });
    const rail = page.getByTestId("home-product-rail-home-new-collection-slider").locator(".homepage-product-grid");
    await rail.scrollIntoViewIfNeeded();

    const before = await rail.locator(".homepage-product-slide").first().boundingBox();
    const box = await rail.boundingBox();
    expect(box).not.toBeNull();

    await page.mouse.move((box?.x ?? 0) + 900, (box?.y ?? 0) + 220);
    await page.mouse.down();
    await page.mouse.move((box?.x ?? 0) + 300, (box?.y ?? 0) + 220, { steps: 10 });
    await page.mouse.up();

    const after = await rail.locator(".homepage-product-slide").first().boundingBox();
    expect(after?.x ?? 0).toBeLessThan((before?.x ?? 0) - 20);
    await expect(page).toHaveURL(/\/$/);
  });
});
