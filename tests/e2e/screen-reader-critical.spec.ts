import { expect, test, type Page } from "@playwright/test";

type AxNode = {
  ignored?: boolean;
  role?: { value?: string };
  name?: { value?: string };
};

type AxExpectation = {
  description: string;
  role: RegExp;
  name?: RegExp;
};

type ScreenReaderRoute = {
  path: string;
  prepare?: (page: Page) => Promise<void>;
  expectations: AxExpectation[];
};

const storefrontRoutes = [
  {
    path: "/",
    expectations: [
      { description: "main landmark", role: /^main$/i },
      { description: "homepage heading", role: /^heading$/i, name: /Sculpted essentials/i },
      { description: "primary shop link", role: /^link$/i, name: /Shop now|Shop all|Shop Velora/i },
      { description: "search control", role: /^button$/i, name: /^Search$/i },
      { description: "bag control", role: /^button$/i, name: /Cart|bag/i },
    ],
  },
  {
    path: "/shop",
    expectations: [
      { description: "main landmark", role: /^main$/i },
      { description: "shop heading", role: /^heading$/i, name: /All activewear|Shop/i },
      { description: "filter control", role: /^button$/i, name: /Filter|filters/i },
      { description: "search control", role: /^button$/i, name: /^Search$/i },
    ],
  },
  {
    path: "/product/flared-pants-7461",
    expectations: [
      { description: "main landmark", role: /^main$/i },
      { description: "product heading", role: /^heading$/i, name: /flared|pant/i },
      { description: "add-to-bag control", role: /^button$/i, name: /Add to bag|Out of stock/i },
      { description: "quantity control", role: /^button$/i, name: /Increase quantity|Decrease quantity/i },
    ],
  },
  {
    path: "/cart",
    expectations: [
      { description: "main landmark", role: /^main$/i },
      { description: "cart heading", role: /^heading$/i, name: /Your bag|Cart/i },
      { description: "checkout or recovery action", role: /^(button|link)$/i, name: /Proceed to Checkout|Shop catalog|Shop all/i },
    ],
  },
  {
    path: "/checkout",
    prepare: seedCheckoutCart,
    expectations: [
      { description: "main landmark", role: /^main$/i },
      { description: "checkout heading", role: /^heading$/i, name: /Delivery address|Order summary|Payment method/i },
      { description: "email field", role: /^(textbox|generic)$/i, name: /Email address/i },
      { description: "mobile field", role: /^(textbox|generic)$/i, name: /Mobile number|Phone/i },
      { description: "payment action", role: /^button$/i, name: /Pay .* securely/i },
    ],
  },
  {
    path: "/contact",
    expectations: [
      { description: "main landmark", role: /^main$/i },
      { description: "contact heading", role: /^heading$/i, name: /Contact|How can we help/i },
      { description: "message field", role: /^(textbox|generic)$/i, name: /Message|How can we help/i },
      { description: "send action", role: /^button$/i, name: /Send|Submit/i },
    ],
  },
  {
    path: "/faqs",
    expectations: [
      { description: "main landmark", role: /^main$/i },
      { description: "FAQ heading", role: /^heading$/i, name: /How can we help\?|Frequently Asked Questions|FAQs/i },
      { description: "FAQ search field", role: /^(textbox|generic)$/i, name: /Search frequently asked questions/i },
    ],
  },
] satisfies ScreenReaderRoute[];

const adminRoutes = [
  {
    path: "/admin",
    heading: "Velora admin Overview",
    expectations: [
      { description: "main landmark", role: /^main$/i },
      { description: "overview heading", role: /^heading$/i, name: /Velora admin Overview/i },
      { description: "orders navigation", role: /^button$/i, name: /^Orders$/i },
      { description: "products navigation", role: /^button$/i, name: /^Products$/i },
    ],
  },
  {
    path: "/admin#orders",
    heading: "Velora admin Orders",
    expectations: [
      { description: "main landmark", role: /^main$/i },
      { description: "orders heading", role: /^heading$/i, name: /Velora admin Orders/i },
      { description: "admin search", role: /^(textbox|searchbox|generic)$/i, name: /Search admin/i },
    ],
  },
  {
    path: "/admin#media",
    heading: "Velora admin Media",
    expectations: [
      { description: "main landmark", role: /^main$/i },
      { description: "media heading", role: /^heading$/i, name: /Velora admin Media/i },
      { description: "media search", role: /^(textbox|searchbox|generic)$/i, name: /Search media assets/i },
    ],
  },
  {
    path: "/admin/content",
    heading: "Content manager",
    expectations: [
      { description: "main landmark", role: /^main$/i },
      { description: "content heading", role: /^heading$/i, name: /Content manager/i },
      { description: "draft action", role: /^(button|link)$/i, name: /Create draft|CREATE DRAFT|New page|Create page|Add page/i },
    ],
  },
  {
    path: "/admin/support",
    heading: "Support queue",
    expectations: [
      { description: "main landmark", role: /^main$/i },
      { description: "support heading", role: /^heading$/i, name: /Support queue/i },
      { description: "support queue controls", role: /^(button|combobox|textbox|generic)$/i, name: /Filter support cases|Status|Priority|Search|Save/i },
    ],
  },
] satisfies Array<{ path: string; heading: string; expectations: AxExpectation[] }>;

async function prepareScreenReaderRun(page: Page, colorScheme: "light" | "dark" = "light") {
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

async function seedCheckoutCart(page: Page) {
  await page.addInitScript((expiresAt) => {
    localStorage.setItem("velora-store", JSON.stringify({
      state: {
        cart: [
          {
            product: {
              id: "screen-reader-checkout-test",
              slug: "screen-reader-checkout-test",
              name: "Screen Reader Checkout Test Set",
              category: "Sets",
              price: 250,
              salePrice: null,
              images: ["/images/velora/aura-legging-2.jpg"],
              colors: ["Black"],
              sizes: ["M"],
              variants: [
                {
                  id: "screen-reader-checkout-variant",
                  stock: 5,
                  color: { id: "black", name: "Black", hex: "#111111" },
                  size: { id: "medium", name: "M" },
                  media: [],
                },
              ],
              variantMediaByColor: {},
            },
            variantId: "screen-reader-checkout-variant",
            size: "M",
            color: "Black",
            quantity: 1,
          },
        ],
        cartSessionKey: "screen-reader-checkout-session",
        cartExpiresAt: expiresAt,
        coupon: undefined,
        customerNote: "",
        wishlist: [],
        wishlistIntents: {},
      },
      version: 3,
    }));
  }, new Date(Date.now() + 60 * 60_000).toISOString());
}

async function signInAsAdmin(page: Page, callbackUrl = "/admin") {
  await prepareScreenReaderRun(page);
  await page.goto(`/admin-login?callbackUrl=${encodeURIComponent(callbackUrl)}`, { waitUntil: "domcontentloaded" });
  const email = page.getByLabel("Email address");
  await expect(email).toBeVisible();
  await email.fill("admin@velora.ae");
  await page.locator("input[name='password']").fill("VeloraAdmin123!");

  const target = new URL(callbackUrl, "http://127.0.0.1:3000");
  const submit = page.getByRole("button", { name: "Sign in securely" });
  await expect(submit).toBeEnabled();
  await Promise.all([
    page.waitForURL((url) => url.pathname === target.pathname && url.hash === target.hash, { timeout: 15_000, waitUntil: "domcontentloaded" }),
    submit.click(),
  ]);
  await expect(page.locator("main").first()).toBeVisible({ timeout: 15_000 });
}

async function getAccessibilityTree(page: Page) {
  const client = await page.context().newCDPSession(page);
  try {
    await client.send("Accessibility.enable");
    const result = await client.send("Accessibility.getFullAXTree");
    return (result.nodes as AxNode[]).filter((node) => !node.ignored);
  } finally {
    await client.detach();
  }
}

function axRole(node: AxNode) {
  return String(node.role?.value ?? "");
}

function axName(node: AxNode) {
  return String(node.name?.value ?? "").replace(/\s+/g, " ").trim();
}

function formatMatchingNodes(nodes: AxNode[], expectation: AxExpectation) {
  return nodes
    .filter((node) => expectation.role.test(axRole(node)))
    .slice(0, 25)
    .map((node) => `${axRole(node)} "${axName(node)}"`)
    .join("\n");
}

function assertAccessibilityTree(nodes: AxNode[], expectations: AxExpectation[]) {
  for (const expectation of expectations) {
    const match = nodes.some((node) => {
      const roleMatches = expectation.role.test(axRole(node));
      const nameMatches = expectation.name ? expectation.name.test(axName(node)) : true;
      return roleMatches && nameMatches;
    });

    expect(match, [
      `Missing accessibility-tree node: ${expectation.description}`,
      `Expected role ${expectation.role}${expectation.name ? ` with name ${expectation.name}` : ""}.`,
      "Available matching-role nodes:",
      formatMatchingNodes(nodes, expectation),
    ].join("\n")).toBe(true);
  }
}

test.describe("critical screen-reader accessibility tree gate", () => {
  for (const route of storefrontRoutes) {
    test(`${route.path} exposes critical storefront landmarks and names`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "desktop-chromium", "Screen-reader smoke gate runs once against Chromium's accessibility tree.");
      await page.setViewportSize({ width: 390, height: 760 });
      await prepareScreenReaderRun(page);
      await route.prepare?.(page);
      await page.goto(route.path, { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle");

      const nodes = await getAccessibilityTree(page);
      assertAccessibilityTree(nodes, route.expectations);
    });
  }

  for (const route of adminRoutes) {
    test(`${route.path} exposes critical admin landmarks and names`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "desktop-chromium", "Screen-reader smoke gate runs once against Chromium's accessibility tree.");
      await page.setViewportSize({ width: 1280, height: 900 });

      if (route.path.includes("#")) {
        await signInAsAdmin(page);
        await page.goto(route.path, { waitUntil: "domcontentloaded" });
      } else {
        await signInAsAdmin(page, route.path);
      }

      await expect(page.getByRole("heading", { name: route.heading }).first()).toBeVisible();
      const nodes = await getAccessibilityTree(page);
      assertAccessibilityTree(nodes, route.expectations);
    });
  }
});
