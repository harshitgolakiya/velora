import { expect, test, type Page } from "@playwright/test";

async function stabilize(page: Page) {
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
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
}

async function seedSelectedCart(page: Page) {
  await page.addInitScript((expiresAt) => {
    localStorage.setItem("velora-store", JSON.stringify({
      state: {
        cart: [
          {
            product: {
              id: "airlift-full-length-legging",
              slug: "airlift-full-length-legging",
              name: "Airlift Full-Length Legging",
              category: "Leggings",
              price: 325,
              salePrice: null,
              images: ["/images/activewear-demo/flow-yoga.jpg"],
              colors: ["Black"],
              sizes: ["S"],
              stock: 10,
              variants: [],
              variantMediaByColor: {},
            },
            size: "S",
            color: "Black",
            quantity: 1,
          },
        ],
        cartSessionKey: "critical-flow-session-123",
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

test.describe("critical storefront and operations flows", () => {
  test("moves a selected product from PDP to cart to checkout validation", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "Critical flow gate runs once on desktop.");
    await stabilize(page);

    await page.goto("/product/airlift-full-length-legging?color=Black&size=S", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: "Airlift Full-Length Legging" })).toBeVisible();

    const purchaseOptions = page.locator("#purchase-options");
    await expect(purchaseOptions.getByRole("button", { name: "S", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(purchaseOptions.getByRole("button", { name: "Add to bag", exact: true })).toBeEnabled();

    await seedSelectedCart(page);
    await page.goto("/cart", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: "Shopping bag" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Airlift Full-Length Legging", exact: true })).toBeVisible();
    await expect(page.getByText("Black / S")).toBeVisible();

    await page.getByRole("button", { name: "Proceed to Checkout" }).click();
    await expect(page).toHaveURL(/\/checkout/);
    await expect(page.getByRole("heading", { name: "Order summary" })).toBeVisible();
    await expect(page.getByText("Airlift Full-Length Legging").first()).toBeVisible();

    const submit = page.getByRole("button", { name: /Continue to delivery/i });
    await expect(submit).toBeVisible();
    await submit.click();
    await expect(page.getByLabel("Email address")).toBeFocused();
    await expect(page.getByRole("alert").filter({ hasText: "Enter a valid email address." })).toBeVisible();
  });

  test("protects account returns and admin routes before authentication", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "Critical flow gate runs once on desktop.");
    await stabilize(page);

    await page.goto("/account/orders/VELORA-UNKNOWN/return", { waitUntil: "domcontentloaded" });
    await page.waitForURL((url) => url.pathname === "/account");
    await expect(page.getByRole("heading", { name: "Your Velora account" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in", exact: true }).first()).toBeVisible();

    await page.goto("/admin", { waitUntil: "domcontentloaded" });
    await page.waitForURL((url) => url.pathname === "/admin-login" && url.searchParams.get("callbackUrl") === "/admin");
    await expect(page.getByRole("heading", { name: "Admin sign in" })).toBeVisible();
    await expect(page.getByLabel("Email address")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in securely" })).toBeVisible();
  });

  test("keeps search zero-result recovery available", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "Critical flow gate runs once on desktop.");
    await stabilize(page);

    await page.goto("/search?q=zzzznotfound", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: "No products found" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Shop all" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Dresses" })).toBeVisible();
  });
});
