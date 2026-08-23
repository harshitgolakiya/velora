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

test.describe("storefront control polish", () => {
  test("shop filters and product-card swatches have stable, usable targets", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "Manual viewport coverage only needs the desktop project.");
    await stabilize(page);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/shop", { waitUntil: "networkidle" });

    const filterButtons = page.locator("[data-filter-trigger]");
    await expect(filterButtons.first()).toBeVisible();
    for (let index = 0; index < await filterButtons.count(); index += 1) {
      const box = await filterButtons.nth(index).boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(40);
    }

    const firstCardSwatches = page.locator(".storefront-stagger article").first().locator('button[aria-label^="Show "]');
    await expect(firstCardSwatches.first()).toBeVisible();
    const swatchBox = await firstCardSwatches.first().boundingBox();
    expect(swatchBox?.width ?? 0).toBeGreaterThanOrEqual(24);
    expect(swatchBox?.height ?? 0).toBeGreaterThanOrEqual(24);

    const swatchGeometry = await firstCardSwatches.first().evaluate((button) => {
      const outer = button.getBoundingClientRect();
      const inner = button.querySelector("span")?.getBoundingClientRect();
      const selectedOutline = window.getComputedStyle(button, "::before");
      return {
        outerWidth: Math.round(outer.width),
        outerHeight: Math.round(outer.height),
        innerWidth: Math.round(inner?.width ?? 0),
        innerHeight: Math.round(inner?.height ?? 0),
        selectedOutlineWidth: Math.round(Number.parseFloat(selectedOutline.width)),
        selectedOutlineHeight: Math.round(Number.parseFloat(selectedOutline.height)),
        selectedOutlineBorder: selectedOutline.borderTopColor,
        left: Math.round((inner?.left ?? 0) - outer.left),
        right: Math.round(outer.right - (inner?.right ?? 0)),
        top: Math.round((inner?.top ?? 0) - outer.top),
        bottom: Math.round(outer.bottom - (inner?.bottom ?? 0)),
      };
    });
    expect(swatchGeometry.outerWidth).toBe(28);
    expect(swatchGeometry.outerHeight).toBe(28);
    expect(swatchGeometry.innerWidth).toBe(16);
    expect(swatchGeometry.innerHeight).toBe(16);
    expect(swatchGeometry.selectedOutlineWidth).toBe(20);
    expect(swatchGeometry.selectedOutlineHeight).toBe(20);
    expect(swatchGeometry.selectedOutlineBorder).not.toBe("rgba(0, 0, 0, 0)");
    expect(Math.abs(swatchGeometry.left - swatchGeometry.right)).toBeLessThanOrEqual(1);
    expect(Math.abs(swatchGeometry.top - swatchGeometry.bottom)).toBeLessThanOrEqual(1);

    await expect(page.locator(".storefront-stagger article")).toHaveCount(24);
    await expect(page.getByText(/Showing 12 of 24 products/i)).toHaveCount(0);
  });

  test("collection and search listing pages avoid blank first-row media and tiny breadcrumb chips", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "Manual viewport coverage only needs the desktop project.");
    await stabilize(page);

    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/collections/pilates-studio", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".storefront-stagger article").first()).toBeVisible();
    await page.waitForFunction(() =>
      Array.from(document.querySelectorAll(".storefront-stagger article"))
        .slice(0, 5)
        .every((article) => {
          const image = article.querySelector("img");
          return image?.complete && image.naturalWidth > 0 && image.naturalHeight > 0;
        }),
    );

    const firstRowMedia = await page.locator(".storefront-stagger article").evaluateAll((articles) =>
      articles.slice(0, 5).map((article) => {
        const image = article.querySelector("img");
        const rect = image?.getBoundingClientRect();
        return {
          complete: image?.complete ?? false,
          naturalWidth: image?.naturalWidth ?? 0,
          naturalHeight: image?.naturalHeight ?? 0,
          width: rect?.width ?? 0,
          height: rect?.height ?? 0,
        };
      }),
    );
    expect(firstRowMedia.length).toBeGreaterThanOrEqual(5);
    for (const media of firstRowMedia) {
      expect(media.complete).toBe(true);
      expect(media.naturalWidth).toBeGreaterThan(0);
      expect(media.naturalHeight).toBeGreaterThan(0);
      expect(media.width).toBeGreaterThan(80);
      expect(media.height).toBeGreaterThan(120);
    }

    const breadcrumbHome = page.getByRole("link", { name: "Home" }).first();
    await expect(breadcrumbHome).toBeVisible();
    const breadcrumbBox = await breadcrumbHome.boundingBox();
    expect(Math.round(breadcrumbBox?.height ?? 0)).toBeGreaterThanOrEqual(40);

    await page.goto("/search?q=dress", { waitUntil: "domcontentloaded" });
    const relatedDestination = page.getByRole("link", { name: "Dresses" }).first();
    await expect(relatedDestination).toBeVisible();
    const destinationBox = await relatedDestination.boundingBox();
    expect(Math.round(destinationBox?.height ?? 0)).toBeGreaterThanOrEqual(40);
  });

  test("product gallery and purchase controls are not tiny click targets", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "Manual viewport coverage only needs the desktop project.");
    await stabilize(page);
    await page.setViewportSize({ width: 390, height: 1100 });
    await page.goto("/product/corset-leather-skirt-set", { waitUntil: "networkidle" });

    const galleryDots = page.getByRole("button", { name: /view media/i });
    await expect(galleryDots.first()).toBeVisible();
    const dotBox = await galleryDots.first().boundingBox();
    expect(dotBox?.width ?? 0).toBeGreaterThanOrEqual(40);
    expect(dotBox?.height ?? 0).toBeGreaterThanOrEqual(40);

    const colorButton = page.getByRole("button", { name: /^Select / }).first();
    await expect(colorButton).toBeVisible();
    const colorBox = await colorButton.boundingBox();
    expect(colorBox?.width ?? 0).toBeGreaterThanOrEqual(40);
    expect(colorBox?.height ?? 0).toBeGreaterThanOrEqual(40);
    const colorSwatchGeometry = await colorButton.evaluate((button) => {
      const outer = button.getBoundingClientRect();
      const frameElement = button.querySelector("[data-product-color-frame]");
      const frame = frameElement?.getBoundingClientRect();
      const chip = button.querySelector("span span")?.getBoundingClientRect();
      const frameRadius = frameElement ? window.getComputedStyle(frameElement).borderRadius : "";
      return {
        outerWidth: Math.round(outer.width),
        outerHeight: Math.round(outer.height),
        frameWidth: Math.round(frame?.width ?? 0),
        frameHeight: Math.round(frame?.height ?? 0),
        chipWidth: Math.round(chip?.width ?? 0),
        chipHeight: Math.round(chip?.height ?? 0),
        left: Math.round((frame?.left ?? 0) - outer.left),
        right: Math.round(outer.right - (frame?.right ?? 0)),
        top: Math.round((frame?.top ?? 0) - outer.top),
        bottom: Math.round(outer.bottom - (frame?.bottom ?? 0)),
        frameRadius,
      };
    });
    expect(colorSwatchGeometry.outerWidth).toBe(40);
    expect(colorSwatchGeometry.outerHeight).toBe(40);
    expect(colorSwatchGeometry.frameWidth).toBe(28);
    expect(colorSwatchGeometry.frameHeight).toBe(28);
    expect(colorSwatchGeometry.chipWidth).toBe(20);
    expect(colorSwatchGeometry.chipHeight).toBe(20);
    expect(Number.parseFloat(colorSwatchGeometry.frameRadius)).toBeLessThanOrEqual(6);
    expect(Math.abs(colorSwatchGeometry.left - colorSwatchGeometry.right)).toBeLessThanOrEqual(1);
    expect(Math.abs(colorSwatchGeometry.top - colorSwatchGeometry.bottom)).toBeLessThanOrEqual(1);

    const sizeGuide = page.getByRole("button", { name: /size guide/i });
    await expect(sizeGuide).toBeVisible();
    const sizeGuideBox = await sizeGuide.boundingBox();
    expect(sizeGuideBox?.height ?? 0).toBeGreaterThanOrEqual(36);

    const sizeButton = page.getByRole("group", { name: /choose size/i }).getByRole("button", { name: "S", exact: true });
    await expect(sizeButton).toBeVisible();
    const sizeBox = await sizeButton.boundingBox();
    expect(sizeBox?.height ?? 0).toBeGreaterThanOrEqual(40);
    const visibleSizeBox = await sizeButton.locator("span").first().boundingBox();
    expect(Math.round(visibleSizeBox?.height ?? 0)).toBe(28);
    const sizeBoxRadius = await sizeButton.locator("[data-product-size-box]").evaluate((element) =>
      Number.parseFloat(window.getComputedStyle(element).borderRadius),
    );
    expect(sizeBoxRadius).toBeLessThanOrEqual(6);

    const mobilePurchaseBar = page.locator('[aria-label="Mobile purchase summary"]');
    await expect(mobilePurchaseBar).toHaveAttribute("data-visible", "false");
    await page.evaluate(() => window.scrollTo(0, 760));
    await expect(mobilePurchaseBar).toHaveAttribute("data-visible", "true");
    const purchaseBarMetrics = await mobilePurchaseBar.evaluate((bar) => {
      const styles = window.getComputedStyle(bar);
      const action = bar.querySelector("button:last-child")?.getBoundingClientRect();
      return {
        opacity: styles.opacity,
        pointerEvents: styles.pointerEvents,
        transform: styles.transform,
        actionHeight: Math.round(action?.height ?? 0),
        horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
      };
    });
    expect(purchaseBarMetrics.opacity).toBe("1");
    expect(purchaseBarMetrics.pointerEvents).toBe("auto");
    expect(purchaseBarMetrics.transform).toBe("matrix(1, 0, 0, 1, 0, 0)");
    expect(purchaseBarMetrics.actionHeight).toBeGreaterThanOrEqual(48);
    expect(purchaseBarMetrics.horizontalOverflow).toBe(false);

    await page.goto("/product/noir-column-gown?color=Black", { waitUntil: "networkidle" });
    const firstColorImage = await page.getByRole("img", { name: /noir column gown/i }).first().getAttribute("src");
    await page.getByRole("button", { name: /select onyx/i }).click();
    await expect(page).toHaveURL(/color=Onyx/);
    const secondColorImage = await page.getByRole("img", { name: /noir column gown/i }).first().getAttribute("src");
    expect(secondColorImage).not.toBe(firstColorImage);
  });

  test("secondary storefront pages avoid tiny mobile actions and empty-cart dead space", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "Manual viewport coverage only needs the desktop project.");
    await stabilize(page);

    await page.setViewportSize({ width: 390, height: 1100 });
    await page.goto("/contact", { waitUntil: "networkidle" });
    for (const label of ["Open menu", "Search", "Cart"]) {
      const target = page.getByRole("button", { name: label }).first();
      await expect(target).toBeVisible();
      const box = await target.boundingBox();
      expect(box?.width ?? 0).toBeGreaterThanOrEqual(40);
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(40);
    }

    const learnMore = page.getByRole("link", { name: /learn more/i }).first();
    await expect(learnMore).toBeVisible();
    const learnMoreBox = await learnMore.boundingBox();
    expect(learnMoreBox?.height ?? 0).toBeGreaterThanOrEqual(40);

    await page.goto("/account", { waitUntil: "networkidle" });
    const forgotPassword = page.getByRole("button", { name: /forgot your password/i });
    await expect(forgotPassword).toBeVisible();
    const forgotBox = await forgotPassword.boundingBox();
    expect(forgotBox?.height ?? 0).toBeGreaterThanOrEqual(40);

    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/cart", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: /complete the look/i })).toBeVisible();
    const firstRecommendation = page.getByRole("link", { name: /view details/i }).first();
    await expect(firstRecommendation).toBeVisible();
    const recommendationBox = await firstRecommendation.boundingBox();
    expect(recommendationBox?.height ?? 0).toBeGreaterThanOrEqual(36);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
  });

  test("utility checkout and header controls keep polished hit targets", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "Manual viewport coverage only needs the desktop project.");
    await stabilize(page);

    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/track-order", { waitUntil: "domcontentloaded" });
    const themeToggle = page.getByRole("button", { name: /switch to dark mode/i });
    await expect(themeToggle).toBeVisible();
    const themeBox = await themeToggle.boundingBox();
    expect(themeBox?.width ?? 0).toBeGreaterThanOrEqual(40);
    expect(themeBox?.height ?? 0).toBeGreaterThanOrEqual(40);

    await page.goto("/checkout", { waitUntil: "domcontentloaded" });
    const cartLink = page.getByRole("link", { name: /cart/i }).first();
    await expect(cartLink).toBeVisible();
    const cartLinkBox = await cartLink.boundingBox();
    expect(cartLinkBox?.height ?? 0).toBeGreaterThanOrEqual(40);

    const browseStore = page.getByRole("link", { name: /browse the store/i });
    await expect(browseStore).toBeVisible();
    const browseBox = await browseStore.boundingBox();
    expect(browseBox?.height ?? 0).toBeGreaterThanOrEqual(48);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
  });

  test("storefront header keeps the logo centered without crowding controls", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "Manual viewport coverage only needs the desktop project.");

    for (const width of [390, 1024, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript(() => {
        localStorage.setItem(
          "velora-store",
          JSON.stringify({
            state: {
              cart: [{
                product: {
                  id: "prd-001",
                  slug: "noir-column-gown",
                  name: "Noir Column Gown",
                  category: "Dresses",
                  collection: "evening-edit",
                  price: 340,
                  rating: 4.9,
                  reviews: 128,
                  stock: 42,
                  colors: ["Ink"],
                  sizes: ["M"],
                  images: ["https://cdn.dummyjson.com/product-images/womens-dresses/black-women's-gown/1.webp"],
                  description: "",
                  fabric: "",
                  care: "",
                },
                size: "M",
                color: "Ink",
                quantity: 9,
              }],
              wishlist: ["noir-column-gown", "faux-leather-moto-jacket"],
              cartOpen: false,
            },
            version: 0,
          }),
        );
      });
      await stabilize(page);
      await page.goto(width === 390 ? "/" : "/shop", { waitUntil: "domcontentloaded" });

      const metrics = await page.evaluate(() => {
        const logo = Array.from(document.querySelectorAll("header a"))
          .find((link) => link.textContent?.trim() === "Velora");
        const nav = document.querySelector("header nav");
        const menu = document.querySelector('header button[aria-label="Open menu"]');
        const icons = Array.from(document.querySelectorAll("header button, header a"))
          .filter((element) => /Search|Account|Wishlist|Cart|Switch/.test(element.getAttribute("aria-label") ?? ""))
          .map((element) => element.getBoundingClientRect())
          .filter((box) => box.width > 0 && box.height > 0);
        const logoBox = logo?.getBoundingClientRect();
        const navBox = nav?.getBoundingClientRect();
        const menuBox = menu?.getBoundingClientRect();
        return {
          logoCenterDelta: logoBox ? Math.abs((logoBox.left + logoBox.width / 2) - window.innerWidth / 2) : Number.POSITIVE_INFINITY,
          logoWidth: logoBox?.width ?? 0,
          navVisible: Boolean(navBox && navBox.width > 0 && navBox.height > 0),
          menuVisible: Boolean(menuBox && menuBox.width > 0 && menuBox.height > 0),
          horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
          firstIconLeft: icons[0]?.left ?? window.innerWidth,
          logoRight: logoBox?.right ?? 0,
          visibleBadges: Array.from(document.querySelectorAll("header .storefront-count-badge"))
            .map((badge) => {
              const box = badge.getBoundingClientRect();
              const parent = badge.parentElement?.getBoundingClientRect();
              return {
                width: box.width,
                height: box.height,
                borderRadius: window.getComputedStyle(badge).borderRadius,
                insideParent:
                  Boolean(parent) &&
                  box.left >= (parent?.left ?? 0) - 1 &&
                  box.right <= (parent?.right ?? 0) + 1 &&
                  box.top >= (parent?.top ?? 0) - 1 &&
                  box.bottom <= (parent?.bottom ?? 0) + 1,
              };
            })
            .filter((badge) => badge.width > 0 && badge.height > 0),
        };
      });

      expect(metrics.logoCenterDelta).toBeLessThanOrEqual(1);
      expect(metrics.logoWidth).toBeGreaterThan(90);
      expect(metrics.horizontalOverflow).toBe(false);
      expect(metrics.firstIconLeft - metrics.logoRight).toBeGreaterThanOrEqual(width < 768 ? 32 : 80);
      if (width < 1280) {
        expect(metrics.menuVisible).toBe(true);
        expect(metrics.navVisible).toBe(false);
      } else {
        expect(metrics.navVisible).toBe(true);
      }
      for (const badge of metrics.visibleBadges) {
        expect(Math.round(badge.width)).toBeGreaterThanOrEqual(16);
        expect(Math.round(badge.height)).toBeGreaterThanOrEqual(16);
        expect(badge.borderRadius).not.toBe("0px");
        expect(badge.insideParent).toBe(true);
      }
    }
  });

  test("overlay menus and search surfaces keep useful controls", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "Manual viewport coverage only needs the desktop project.");
    await stabilize(page);
    await page.setViewportSize({ width: 390, height: 1100 });
    await page.goto("/", { waitUntil: "domcontentloaded" });

    await page.getByRole("button", { name: /open menu/i }).click();
    const menuDialog = page.getByRole("dialog").filter({ hasText: /featured edit/i });
    const mobileTheme = menuDialog.getByRole("button", { name: /switch to dark mode/i });
    await expect(mobileTheme).toBeVisible();
    const mobileThemeBox = await mobileTheme.boundingBox();
    expect(Math.round(mobileThemeBox?.width ?? 0)).toBeGreaterThanOrEqual(40);
    expect(Math.round(mobileThemeBox?.height ?? 0)).toBeGreaterThanOrEqual(40);

    const mobileLanguage = menuDialog.getByRole("link", { name: /switch to arabic/i });
    await expect(mobileLanguage).toBeVisible();
    const mobileLanguageBox = await mobileLanguage.boundingBox();
    expect(Math.round(mobileLanguageBox?.height ?? 0)).toBeGreaterThanOrEqual(40);

    await page.getByRole("button", { name: /close menu/i }).click();
    await page.waitForTimeout(300);

    await page.getByRole("button", { name: /^search$/i }).click();
    const popularSearch = page.getByRole("button", { name: /black gown/i });
    await expect(popularSearch).toBeVisible();
    const popularBox = await popularSearch.boundingBox();
    expect(Math.round(popularBox?.height ?? 0)).toBeGreaterThanOrEqual(40);
    await page.getByRole("button", { name: /close search/i }).click();

    await page.getByRole("button", { name: /^cart$/i }).click();
    const closeCart = page.getByRole("button", { name: /close cart/i });
    await expect(closeCart).toBeVisible();
    const closeCartBox = await closeCart.boundingBox();
    expect(Math.round(closeCartBox?.width ?? 0)).toBeGreaterThanOrEqual(40);
    expect(Math.round(closeCartBox?.height ?? 0)).toBeGreaterThanOrEqual(40);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
  });

  test("guest account actions open a polished login dialog without redirecting", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "Manual viewport coverage only needs the desktop project.");
    await stabilize(page);

    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /^account$/i }).click();
    await expect(page).toHaveURL(/\/$/);
    const accountDialog = page.getByRole("dialog").filter({ hasText: /account access/i });
    await expect(accountDialog).toBeVisible();
    await expect(accountDialog.getByLabel(/email address/i)).toBeVisible();
    await expect(accountDialog.getByLabel(/password/i)).toBeVisible();
    const dialogBox = await accountDialog.boundingBox();
    expect(dialogBox?.width ?? 0).toBeGreaterThan(320);
    expect(dialogBox?.height ?? 0).toBeGreaterThan(360);
    await page.getByRole("button", { name: /close account login/i }).click();

    await page.setViewportSize({ width: 390, height: 1100 });
    await page.goto("/", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /open menu/i }).click();
    const menuDialog = page.getByRole("dialog").filter({ hasText: /featured edit/i });
    await menuDialog.getByRole("button", { name: /^account$/i }).click();
    await expect(page.getByRole("dialog").filter({ hasText: /account access/i })).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
  });

  test("product review form controls keep premium mobile targets", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "Manual viewport coverage only needs the desktop project.");
    await stabilize(page);
    await page.setViewportSize({ width: 390, height: 1100 });
    await page.goto("/product/noir-column-gown#reviews", { waitUntil: "networkidle" });

    const reviewForm = page.locator("form").filter({ hasText: /write a review|edit your review/i });
    await expect(reviewForm).toBeVisible();
    const star = reviewForm.getByRole("button", { name: /5 stars/i });
    await expect(star).toBeVisible();
    const starBox = await star.boundingBox();
    expect(Math.round(starBox?.width ?? 0)).toBeGreaterThanOrEqual(40);
    expect(Math.round(starBox?.height ?? 0)).toBeGreaterThanOrEqual(40);

    const titleInput = reviewForm.getByLabel(/review title/i);
    const bodyInput = reviewForm.getByLabel(/your review/i);
    const submit = reviewForm.getByRole("button", { name: /submit review|update review/i });
    for (const control of [titleInput, bodyInput, submit]) {
      await expect(control).toBeVisible();
      const box = await control.boundingBox();
      expect(Math.round(box?.height ?? 0)).toBeGreaterThanOrEqual(44);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
  });
});
