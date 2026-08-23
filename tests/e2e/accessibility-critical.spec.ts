import { expect, test, type Page } from "@playwright/test";

const criticalRoutes = [
  { path: "/", shell: "storefront" },
  { path: "/shop", shell: "storefront" },
  { path: "/product/airlift-full-length-legging", shell: "storefront" },
  { path: "/cart", shell: "storefront" },
  { path: "/checkout", shell: "checkout" },
  { path: "/account", shell: "storefront" },
  { path: "/contact", shell: "storefront" },
  { path: "/faqs", shell: "storefront" },
  { path: "/admin-login?callbackUrl=/admin", shell: "admin" },
] as const;

const authenticatedAdminRoutes = [
  { path: "/admin", heading: "Velora admin Overview" },
  { path: "/admin#orders", heading: "Velora admin Orders" },
  { path: "/admin#media", heading: "Velora admin Media" },
  { path: "/admin/content", heading: "Content manager" },
  { path: "/admin/support", heading: "Support queue" },
] as const;

const adminProductSearchQueries = ["pants", "dress", "top", "velora"] as const;

const zoomAndThemeRoutes = ["/", "/shop", "/product/airlift-full-length-legging", "/cart", "/checkout", "/contact", "/faqs"] as const;

async function prepareAccessibilityRun(page: Page, colorScheme: "light" | "dark" = "light") {
  await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
  await page.addInitScript(() => {
    localStorage.setItem("velora-consent-v1", JSON.stringify({
      necessary: true,
      analytics: false,
      marketing: false,
      preferences: false,
      updatedAt: "2026-01-01T00:00:00.000Z",
    }));
    localStorage.setItem("velora-newsletter", "dismissed");
  });
  await page.addInitScript((theme) => {
    localStorage.setItem("velora-theme", theme);
    document.documentElement.dataset.theme = theme;
  }, colorScheme);
}

async function auditPage(page: Page) {
  return page.evaluate(() => {
    const isVisible = (element: Element) => {
      const style = window.getComputedStyle(element);
      const box = element.getBoundingClientRect();
      return style.display !== "none"
        && style.visibility !== "hidden"
        && style.opacity !== "0"
        && box.width > 0
        && box.height > 0;
    };

    const textFromIds = (ids: string | null) => ids
      ?.split(/\s+/)
      .map((id) => document.getElementById(id)?.textContent?.trim())
      .filter(Boolean)
      .join(" ") ?? "";

    const labelFor = (element: Element) => {
      const id = element.getAttribute("id");
      const explicit = id ? document.querySelector(`label[for="${CSS.escape(id)}"]`)?.textContent?.trim() : "";
      const implicit = element.closest("label")?.textContent?.trim() ?? "";
      return explicit || implicit;
    };

    const accessibleName = (element: Element) => {
      const ariaLabel = element.getAttribute("aria-label")?.trim() ?? "";
      const ariaLabelledBy = textFromIds(element.getAttribute("aria-labelledby")).trim();
      const title = element.getAttribute("title")?.trim() ?? "";
      const alt = element.querySelector("img")?.getAttribute("alt")?.trim() ?? "";
      const label = labelFor(element);
      const text = element.textContent?.trim() ?? "";
      return ariaLabel || ariaLabelledBy || label || text || alt || title;
    };

    const controlSelector = [
      "a[href]",
      "button",
      "input:not([type='hidden'])",
      "select",
      "textarea",
      "[role='button']",
      "[role='link']",
      "[role='combobox']",
      "[role='textbox']",
    ].join(",");
    const unnamedControls = Array.from(document.querySelectorAll(controlSelector))
      .filter((element) => isVisible(element))
      .filter((element) => !(element as HTMLButtonElement | HTMLInputElement).disabled)
      .filter((element) => !accessibleName(element))
      .map((element) => element.outerHTML.slice(0, 180));

    const ids = Array.from(document.querySelectorAll("[id]")).map((element) => element.id).filter(Boolean);
    const duplicateIds = Array.from(new Set(ids.filter((id, index) => ids.indexOf(id) !== index)));

    const headings = Array.from(document.querySelectorAll("h1,h2,h3,h4,h5,h6"))
      .filter((element) => isVisible(element))
      .map((element) => ({
        level: Number(element.tagName.slice(1)),
        text: element.textContent?.trim() ?? "",
      }));
    const headingSkips: string[] = [];
    for (let index = 1; index < headings.length; index += 1) {
      if (headings[index].level - headings[index - 1].level > 1) {
        headingSkips.push(`${headings[index - 1].text} -> ${headings[index].text}`);
      }
    }

    return {
      duplicateIds,
      headingCount: headings.length,
      headingSkips,
      mainCount: Array.from(document.querySelectorAll("main")).filter((element) => isVisible(element)).length,
      unnamedControls,
      overflow: document.documentElement.scrollWidth - window.innerWidth,
    };
  });
}

async function signInAsAdmin(page: Page, callbackUrl = "/admin") {
  await prepareAccessibilityRun(page);
  await page.goto(`/admin-login?callbackUrl=${encodeURIComponent(callbackUrl)}`, { waitUntil: "domcontentloaded" });
  const email = page.getByLabel("Email address");
  await expect(email).toBeVisible();
  await email.fill("admin@velora.ae");
  await page.locator("input[name='password']").fill("VeloraAdmin123!");
  const passwordVisibility = page.getByRole("button", { name: "Show password" });
  await passwordVisibility.click();
  await expect(page.locator("input[name='password']")).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Hide password" }).click();
  const target = new URL(callbackUrl, "http://127.0.0.1:3000");
  const submit = page.getByRole("button", { name: "Sign in securely" });
  await expect(submit).toBeEnabled();
  await Promise.all([
    page.waitForURL((url) => url.pathname === target.pathname && url.hash === target.hash, { timeout: 15_000, waitUntil: "domcontentloaded" }),
    submit.click(),
  ]);
  await expect(page.locator("main").first()).toBeVisible({ timeout: 15_000 });
}

async function getFirstAdminProductPath(page: Page) {
  for (const query of adminProductSearchQueries) {
    const response = await page.request.get(`/api/admin/search?q=${encodeURIComponent(query)}`);
    expect(response.ok()).toBeTruthy();
    const body = await response.json() as {
      results: Array<{ section: string; href?: string }>;
    };
    const products = body.results.filter((result) => result.section === "products" && result.href);
    for (const product of products) {
      const preview = await page.request.get(`${product.href}/preview`);
      if (preview.ok()) return product.href!;
    }
  }
  throw new Error("No seeded admin product found for accessibility audit.");
}

async function getFirstAdminContentPath(page: Page) {
  const response = await page.request.get("/api/admin/pages");
  expect(response.ok()).toBeTruthy();
  const body = await response.json() as {
    pages: Array<{ id: string; title: string }>;
  };
  const pageContent = body.pages.find((item) => item.id);
  if (!pageContent) throw new Error("No seeded admin content page found for accessibility audit.");
  return { path: `/admin/content/${pageContent.id}`, title: pageContent.title };
}

async function openAdminSection(page: Page, label: string, heading: string | RegExp) {
  await page.goto("/admin", { waitUntil: "domcontentloaded" });
  const sectionButton = page.getByRole("navigation").getByRole("button", { name: label });
  await expect(sectionButton).toBeVisible();
  await sectionButton.click();
  await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible();
}

test.describe("critical accessibility release gate", () => {
  for (const route of criticalRoutes) {
    test(`${route.path} exposes landmarks, named controls, stable headings, and no horizontal overflow`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "desktop-chromium", "Critical accessibility DOM audit runs once per browser build.");
      await page.setViewportSize({ width: 390, height: 760 });
      await prepareAccessibilityRun(page);
      await page.goto(route.path, { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => undefined);

      await expect(page.locator("main").first()).toBeVisible();
      if (route.shell === "storefront") {
        await expect(page.locator("header")).toBeVisible();
        await expect(page.getByRole("contentinfo")).toBeVisible();
      } else if (route.shell === "checkout") {
        await expect(page.locator("header")).toBeVisible();
      }

      const result = await auditPage(page);
      expect(result.mainCount).toBe(1);
      expect(result.headingCount).toBeGreaterThan(0);
      expect(result.headingSkips).toEqual([]);
      expect(result.duplicateIds).toEqual([]);
      expect(result.unnamedControls).toEqual([]);
      expect(result.overflow).toBeLessThanOrEqual(1);
    });
  }

  for (const path of zoomAndThemeRoutes) {
    test(`${path} remains accessible in dark mode at 200% zoom`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "desktop-chromium", "Zoom/theme accessibility audit runs once per browser build.");
      await page.setViewportSize({ width: 640, height: 760 });
      await prepareAccessibilityRun(page, "dark");
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => undefined);

      const result = await auditPage(page);
      expect(result.mainCount).toBe(1);
      expect(result.headingCount).toBeGreaterThan(0);
      expect(result.duplicateIds).toEqual([]);
      expect(result.unnamedControls).toEqual([]);
      expect(result.overflow).toBeLessThanOrEqual(1);
    });
  }

  for (const route of authenticatedAdminRoutes) {
    test(`${route.path} authenticated admin workflow remains accessible`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "desktop-chromium", "Authenticated admin accessibility audit runs once per browser build.");
      await page.setViewportSize({ width: 1280, height: 900 });
      if (route.path.includes("#")) {
        await signInAsAdmin(page);
        await page.goto(route.path, { waitUntil: "domcontentloaded" });
      } else {
        await signInAsAdmin(page, route.path);
      }

      await expect(page.locator("main").first()).toBeVisible();
      await expect(page.getByRole("heading", { name: route.heading }).first()).toBeVisible();

      const result = await auditPage(page);
      expect(result.mainCount).toBe(1);
      expect(result.headingCount).toBeGreaterThan(0);
      expect(result.duplicateIds).toEqual([]);
      expect(result.unnamedControls).toEqual([]);
      expect(result.overflow).toBeLessThanOrEqual(1);
    });
  }

  test("deeper authenticated admin workflows remain accessible", async ({ page }, testInfo) => {
    test.setTimeout(90_000);
    test.skip(testInfo.project.name !== "desktop-chromium", "Authenticated admin accessibility audit runs once per browser build.");
    await page.setViewportSize({ width: 1280, height: 900 });
    await signInAsAdmin(page);

    const productPath = await getFirstAdminProductPath(page);
    const content = await getFirstAdminContentPath(page);
    const routes = [
      { path: productPath, heading: "Edit product" },
      { path: `${productPath}/preview`, heading: "Admin preview" },
      { path: content.path, heading: content.title },
      { path: `${content.path}/preview`, heading: /preview/i },
      { path: "/admin/email-templates", heading: "Email template editor" },
    ] as const;

    for (const route of routes) {
      await page.goto(route.path, { waitUntil: "domcontentloaded" });
      await expect(page.locator("main").first()).toBeVisible();
      await expect(page.getByRole("heading", { name: route.heading }).first()).toBeVisible();

      const result = await auditPage(page);
      expect(result.mainCount).toBe(1);
      expect(result.headingCount).toBeGreaterThan(0);
      expect(result.duplicateIds).toEqual([]);
      expect(result.unnamedControls).toEqual([]);
      expect(result.overflow).toBeLessThanOrEqual(1);
    }

    await openAdminSection(page, "Orders", "Velora admin Orders");
    await expect(page.getByRole("heading", { name: /Order dashboard/ }).first()).toBeVisible();
    const reviewButton = page.getByRole("button", { name: /^Review$/ }).first();
    if (await reviewButton.count()) {
      await reviewButton.click();
      await expect(page.getByRole("button", { name: "Close order review panel" })).toBeVisible();
      const result = await auditPage(page);
      expect(result.mainCount).toBe(1);
      expect(result.duplicateIds).toEqual([]);
      expect(result.unnamedControls).toEqual([]);
      expect(result.overflow).toBeLessThanOrEqual(1);
    }

    await openAdminSection(page, "Media", "Velora admin Media");
    const mediaButton = page.getByRole("button", { name: /^Edit media asset / }).first();
    if (await mediaButton.count()) {
      await mediaButton.click();
      await expect(page.getByRole("button", { name: "Close Edit media asset" })).toBeVisible();
      const result = await auditPage(page);
      expect(result.mainCount).toBe(1);
      expect(result.duplicateIds).toEqual([]);
      expect(result.unnamedControls).toEqual([]);
      expect(result.overflow).toBeLessThanOrEqual(1);
    }
  });
});
