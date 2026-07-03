import { expect, test, type Page } from "@playwright/test";

const criticalRoutes = [
  { path: "/", shell: "storefront" },
  { path: "/shop", shell: "storefront" },
  { path: "/product/flared-pants-7461", shell: "storefront" },
  { path: "/cart", shell: "storefront" },
  { path: "/checkout", shell: "checkout" },
  { path: "/admin-login?callbackUrl=/admin", shell: "admin" },
] as const;

async function prepareAccessibilityRun(page: Page) {
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  await page.addInitScript(() => {
    localStorage.setItem("velora-theme", "light");
    localStorage.setItem("velora-consent-v1", JSON.stringify({
      necessary: true,
      analytics: false,
      marketing: false,
      preferences: false,
      updatedAt: "2026-01-01T00:00:00.000Z",
    }));
    localStorage.setItem("velora-newsletter", "dismissed");
  });
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

test.describe("critical accessibility release gate", () => {
  for (const route of criticalRoutes) {
    test(`${route.path} exposes landmarks, named controls, stable headings, and no horizontal overflow`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "desktop-chromium", "Critical accessibility DOM audit runs once per browser build.");
      await page.setViewportSize({ width: 390, height: 760 });
      await prepareAccessibilityRun(page);
      await page.goto(route.path, { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle");

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
});
