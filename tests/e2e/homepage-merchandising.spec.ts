import { expect, test, type Locator, type Page } from "@playwright/test";

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

async function canVisuallyChangeAnyProductCardSwatch(cards: Locator) {
  for (let cardIndex = 0; cardIndex < await cards.count(); cardIndex += 1) {
    const card = cards.nth(cardIndex);
    const swatches = card.locator('button[aria-label^="Show "]');
    const swatchCount = await swatches.count();

    if (swatchCount < 2) continue;

    const image = card.locator("img").first();
    const media = card.locator(".storefront-product-media");
    const before = await image.getAttribute("src");

    for (let swatchIndex = 1; swatchIndex < swatchCount; swatchIndex += 1) {
      const swatch = swatches.nth(swatchIndex);
      await swatch.hover();
      const beforePixels = await media.screenshot();

      await swatch.click();
      await expect(swatch).toHaveAttribute("aria-pressed", "true");

      try {
        await expect.poll(() => image.getAttribute("src"), { timeout: 1200 }).not.toBe(before);
        const afterPixels = await media.screenshot();
        expect(Buffer.compare(beforePixels, afterPixels)).not.toBe(0);
        return true;
      } catch {
        // Some product colors legitimately reuse the same primary image or visual media.
      }
    }
  }

  return false;
}

test.describe("homepage merchandising", () => {
  test("orders homepage sections around spotlight and product sliders", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "Homepage desktop layout assertions only need the desktop project.");
    await page.setViewportSize({ width: 1440, height: 1200 });
    await stabilize(page);

    await page.goto("/", { waitUntil: "domcontentloaded" });

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

    await page.goto("/", { waitUntil: "domcontentloaded" });
    const box = await page.getByTestId("home-spotlight-banner").boundingBox();

    expect(Math.round(box?.x ?? -1)).toBe(0);
    expect(Math.round(box?.width ?? 0)).toBe(1440);
  });

  test("crop-sensitive homepage media keeps stable visual proportions", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "Visual proportion coverage only needs the desktop project.");
    await page.setViewportSize({ width: 1440, height: 1200 });
    await stabilize(page);

    await page.goto("/", { waitUntil: "domcontentloaded" });

    const categoryShopAll = page.getByTestId("home-category-media").getByRole("link", { name: /shop all/i });
    await expect(categoryShopAll).toBeVisible();
    const categoryShopAllBox = await categoryShopAll.boundingBox();
    expect(Math.round(categoryShopAllBox?.height ?? 0)).toBeGreaterThanOrEqual(40);

    const categoryTile = await page.getByTestId("home-category-media").locator(".homepage-media-grid > a").first().boundingBox();
    expect(categoryTile).not.toBeNull();
    expect((categoryTile?.width ?? 0) / (categoryTile?.height ?? 1)).toBeCloseTo(3 / 4.45, 1);

    const collectionFrame = await page.getByTestId("home-collection-story").locator(".homepage-collection-story-frame").first().boundingBox();
    expect(collectionFrame).not.toBeNull();
    expect((collectionFrame?.width ?? 0) / (collectionFrame?.height ?? 1)).toBeCloseTo(16 / 10, 1);
  });

  test("product sliders show five cards at desktop and six at wide desktop", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "Manual viewport coverage only needs the desktop project.");
    await stabilize(page);

    await page.setViewportSize({ width: 1440, height: 1200 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    let metrics = await railMetrics(page, "home-product-rail-home-new-collection-slider");
    expect(metrics.childCount).toBeGreaterThan(5);
    expect(metrics.fullyVisible).toBe(5);
    expect(metrics.scrollWidth).toBeGreaterThan(metrics.clientWidth);

    await page.setViewportSize({ width: 1920, height: 1200 });
    await page.reload({ waitUntil: "domcontentloaded" });
    metrics = await railMetrics(page, "home-product-rail-home-new-collection-slider");
    expect(metrics.childCount).toBeGreaterThan(5);
    expect(metrics.fullyVisible).toBe(6);
    expect(metrics.scrollWidth).toBeGreaterThan(metrics.clientWidth);
  });

  test("product slider headings do not collide with carousel controls or cards", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "Slider heading layout only needs the desktop project.");
    await page.setViewportSize({ width: 1920, height: 1200 });
    await stabilize(page);

    await page.goto("/", { waitUntil: "domcontentloaded" });

    const rails = page.locator('[data-testid^="home-product-rail-"]');
    await expect(rails.first()).toBeVisible();

    for (let index = 0; index < await rails.count(); index += 1) {
      const rail = rails.nth(index);
      await rail.scrollIntoViewIfNeeded();
      const heading = rail.locator("h2").first();
      const controls = rail.getByRole("button", { name: /products/i }).first();
      const grid = rail.locator(".homepage-product-grid");
      const headingBox = await heading.boundingBox();
      const controlsBox = await controls.boundingBox();
      const gridBox = await grid.boundingBox();

      expect(headingBox).not.toBeNull();
      expect(controlsBox).not.toBeNull();
      expect(gridBox).not.toBeNull();
      expect((headingBox?.y ?? 0) + (headingBox?.height ?? 0) + 32).toBeLessThanOrEqual(gridBox?.y ?? 0);
      expect((headingBox?.x ?? 0) + (headingBox?.width ?? 0)).toBeLessThan((controlsBox?.x ?? 0) - 24);
    }
  });

  test("product sliders can be dragged without opening a product", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "Drag behavior coverage only needs the desktop project.");
    await page.setViewportSize({ width: 1440, height: 1200 });
    await stabilize(page);

    await page.goto("/", { waitUntil: "domcontentloaded" });
    const section = page.getByTestId("home-product-rail-home-new-collection-slider");
    const rail = section.locator(".homepage-product-grid");
    await rail.scrollIntoViewIfNeeded();
    await expect(section.getByRole("button", { name: /next products/i })).toBeEnabled();

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

  test("product slider swatches visibly update homepage card imagery like shop cards", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "Swatch interaction coverage only needs the desktop project.");
    await page.setViewportSize({ width: 1440, height: 1200 });
    await stabilize(page);

    await page.goto("/", { waitUntil: "domcontentloaded" });

    const rails = page.locator('[data-testid^="home-product-rail-"]');
    await expect(rails.first()).toBeVisible();

    for (let railIndex = 0; railIndex < await rails.count(); railIndex += 1) {
      const rail = rails.nth(railIndex);
      await rail.scrollIntoViewIfNeeded();
      if (await canVisuallyChangeAnyProductCardSwatch(rail.locator("article"))) {
        await page.goto("/shop", { waitUntil: "domcontentloaded" });
        await expect(page.locator(".storefront-stagger article").first()).toBeVisible();
        await expect(await canVisuallyChangeAnyProductCardSwatch(page.locator(".storefront-stagger article"))).toBe(true);
        return;
      }
    }

    throw new Error("No homepage product rail card changed imagery after selecting another color swatch.");
  });
});
