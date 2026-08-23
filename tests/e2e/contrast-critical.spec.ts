import { expect, test, type Page } from "@playwright/test";

const storefrontRoutes = ["/", "/shop", "/product/airlift-full-length-legging", "/cart", "/checkout", "/contact", "/faqs"] as const;
const adminRoutes = [
  { path: "/admin", heading: "Velora admin Overview" },
  { path: "/admin#orders", heading: "Velora admin Orders" },
  { path: "/admin#media", heading: "Velora admin Media" },
  { path: "/admin/content", heading: "Content manager" },
  { path: "/admin/support", heading: "Support queue" },
] as const;

async function prepareContrastRun(page: Page, colorScheme: "light" | "dark" = "light") {
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

async function signInAsAdmin(page: Page, callbackUrl = "/admin") {
  await prepareContrastRun(page);
  await page.goto(`/admin-login?callbackUrl=${encodeURIComponent(callbackUrl)}`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => undefined);
  await page.getByLabel("Email address").fill("admin@velora.ae");
  await page.locator("input[name='password']").fill("VeloraAdmin123!");
  const target = new URL(callbackUrl, "http://127.0.0.1:3000");
  const submit = page.getByRole("button", { name: "Sign in securely" });
  await expect(submit).toBeEnabled();
  await Promise.all([
    page.waitForURL((url) => url.pathname === target.pathname && url.hash === target.hash, { timeout: 15_000 }),
    submit.click(),
  ]);
  await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => undefined);
}

async function auditTextContrast(page: Page) {
  return page.evaluate(() => {
    type Rgba = { r: number; g: number; b: number; a: number };

    const parseColor = (value: string): Rgba | null => {
      const trimmed = value.trim();
      if (!trimmed || trimmed === "transparent") return null;
      const match = /^rgba?\(([^)]+)\)$/.exec(trimmed);
      if (!match) return null;
      const parts = match[1].split(/\s*,\s*|\s+/).filter((part) => part !== "/");
      const [r, g, b] = parts.slice(0, 3).map((part) => Number.parseFloat(part));
      const alpha = parts[3] == null ? 1 : Number.parseFloat(parts[3]);
      if (![r, g, b, alpha].every(Number.isFinite)) return null;
      return { r, g, b, a: alpha };
    };

    const blend = (foreground: Rgba, background: Rgba): Rgba => {
      const alpha = foreground.a + background.a * (1 - foreground.a);
      if (alpha <= 0) return { r: 255, g: 255, b: 255, a: 1 };
      return {
        r: (foreground.r * foreground.a + background.r * background.a * (1 - foreground.a)) / alpha,
        g: (foreground.g * foreground.a + background.g * background.a * (1 - foreground.a)) / alpha,
        b: (foreground.b * foreground.a + background.b * background.a * (1 - foreground.a)) / alpha,
        a: alpha,
      };
    };

    const relativeLuminance = (color: Rgba) => {
      const channel = (value: number) => {
        const normalized = value / 255;
        return normalized <= 0.03928
          ? normalized / 12.92
          : ((normalized + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * channel(color.r) + 0.7152 * channel(color.g) + 0.0722 * channel(color.b);
    };

    const contrastRatio = (foreground: Rgba, background: Rgba) => {
      const light = Math.max(relativeLuminance(foreground), relativeLuminance(background));
      const dark = Math.min(relativeLuminance(foreground), relativeLuminance(background));
      return (light + 0.05) / (dark + 0.05);
    };

    const visible = (element: Element) => {
      const style = window.getComputedStyle(element);
      const box = element.getBoundingClientRect();
      return style.display !== "none"
        && style.visibility !== "hidden"
        && style.opacity !== "0"
        && box.width > 0
        && box.height > 0;
    };

    const backgroundFor = (element: Element): Rgba => {
      let background: Rgba = { r: 255, g: 255, b: 255, a: 1 };
      const chain: Element[] = [];
      for (let node: Element | null = element; node; node = node.parentElement) chain.push(node);
      for (const node of chain.reverse()) {
        const color = parseColor(window.getComputedStyle(node).backgroundColor);
        if (color && color.a > 0) background = blend(color, background);
      }
      return background;
    };

    const failures: Array<{ text: string; selector: string; ratio: number; required: number; fontSize: string; color: string; background: string }> = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const text = node.textContent?.replace(/\s+/g, " ").trim() ?? "";
        if (text.length < 2) return NodeFilter.FILTER_REJECT;
        const parent = node.parentElement;
        if (!parent || parent.closest("[aria-hidden='true'],.sr-only,script,style,noscript,svg")) return NodeFilter.FILTER_REJECT;
        if (!visible(parent)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const element = node.parentElement!;
      let hasImageOrGradientBackground = false;
      for (let current: Element | null = element; current; current = current.parentElement) {
        const style = window.getComputedStyle(current);
        if (style.backgroundImage && style.backgroundImage !== "none") {
          hasImageOrGradientBackground = true;
          break;
        }
        if (current.querySelector(":scope > img, :scope > picture, :scope > video, :scope > iframe")) {
          hasImageOrGradientBackground = true;
          break;
        }
      }
      if (hasImageOrGradientBackground) continue;

      const style = window.getComputedStyle(element);
      const foreground = parseColor(style.color);
      if (!foreground || foreground.a === 0) continue;
      const background = backgroundFor(element);
      const ratio = contrastRatio(blend(foreground, background), background);
      const fontSize = Number.parseFloat(style.fontSize);
      const fontWeight = Number.parseInt(style.fontWeight, 10);
      const largeText = fontSize >= 24 || (fontSize >= 18.66 && fontWeight >= 700);
      const required = largeText ? 3 : 4.5;
      if (ratio + 0.01 >= required) continue;

      const text = node.textContent?.replace(/\s+/g, " ").trim().slice(0, 90) ?? "";
      const selector = [
        element.tagName.toLowerCase(),
        element.id ? `#${element.id}` : "",
        element.className && typeof element.className === "string"
          ? `.${element.className.trim().split(/\s+/).slice(0, 3).join(".")}`
          : "",
      ].join("");
      failures.push({
        text,
        selector,
        ratio: Number(ratio.toFixed(2)),
        required,
        fontSize: style.fontSize,
        color: style.color,
        background: `rgb(${Math.round(background.r)}, ${Math.round(background.g)}, ${Math.round(background.b)})`,
      });
    }

    return failures;
  });
}

test.describe("critical color contrast release gate", () => {
  for (const route of storefrontRoutes) {
    test(`${route} meets text contrast in light mode`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "desktop-chromium", "Contrast audit runs once per browser build.");
      await page.setViewportSize({ width: 390, height: 760 });
      await prepareContrastRun(page);
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => undefined);

      expect(await auditTextContrast(page)).toEqual([]);
    });

    test(`${route} meets text contrast in dark mode`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "desktop-chromium", "Contrast audit runs once per browser build.");
      await page.setViewportSize({ width: 390, height: 760 });
      await prepareContrastRun(page, "dark");
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => undefined);

      expect(await auditTextContrast(page)).toEqual([]);
    });
  }

  for (const route of adminRoutes) {
    test(`${route.path} authenticated admin text meets contrast`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "desktop-chromium", "Contrast audit runs once per browser build.");
      await page.setViewportSize({ width: 1280, height: 900 });
      if (route.path.includes("#")) {
        await signInAsAdmin(page);
        await page.goto(route.path, { waitUntil: "domcontentloaded" });
        await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => undefined);
      } else {
        await signInAsAdmin(page, route.path);
      }
      await expect(page.getByRole("heading", { name: route.heading }).first()).toBeVisible();

      expect(await auditTextContrast(page)).toEqual([]);
    });
  }
});
