import { expect, test, type Page } from "@playwright/test";

async function seedCheckoutCart(page: Page) {
  await page.addInitScript((expiresAt) => {
    localStorage.setItem("velora-theme", "light");
    localStorage.setItem("velora-consent-v1", JSON.stringify({
      necessary: true,
      analytics: false,
      marketing: false,
      preferences: false,
      updatedAt: "2026-01-01T00:00:00.000Z",
    }));
    localStorage.setItem("velora-store", JSON.stringify({
      state: {
        cart: [
          {
            product: {
              id: "checkout-mobile-test",
              slug: "checkout-mobile-test",
              name: "Mobile Checkout Test Set",
              category: "Sets",
              price: 250,
              salePrice: null,
              images: ["/images/velora/aura-legging-2.jpg"],
              colors: ["Black"],
              sizes: ["M"],
              variants: [
                {
                  id: "checkout-mobile-variant",
                  stock: 5,
                  color: { id: "black", name: "Black", hex: "#111111" },
                  size: { id: "medium", name: "M" },
                  media: [],
                },
              ],
              variantMediaByColor: {},
            },
            variantId: "checkout-mobile-variant",
            size: "M",
            color: "Black",
            quantity: 1,
          },
        ],
        cartSessionKey: "checkout-mobile-session-123",
        cartExpiresAt: expiresAt,
        coupon: undefined,
        customerNote: "",
        wishlist: [],
        wishlistIntents: {},
      },
      version: 3,
    }));
  }, new Date(Date.now() + 60 * 60_000).toISOString());
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
}

async function seedBlockedCheckoutCart(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("velora-theme", "light");
    localStorage.setItem("velora-consent-v1", JSON.stringify({
      necessary: true,
      analytics: false,
      marketing: false,
      preferences: false,
      updatedAt: "2026-01-01T00:00:00.000Z",
    }));
    localStorage.setItem("velora-store", JSON.stringify({
      state: {
        cart: [
          {
            product: {
              id: "checkout-mobile-test",
              slug: "checkout-mobile-test",
              name: "Mobile Checkout Test Set",
              category: "Sets",
              price: 250,
              salePrice: null,
              images: ["/images/velora/aura-legging-2.jpg"],
              colors: ["Black"],
              sizes: ["M"],
              variants: [],
              variantMediaByColor: {},
            },
            size: "M",
            color: "Black",
            quantity: 1,
          },
        ],
        cartSessionKey: "checkout-mobile-session-123",
        cartReservationError: "NETWORK_UNAVAILABLE",
        cartSyncStatus: "error",
        coupon: undefined,
        customerNote: "",
        wishlist: [],
        wishlistIntents: {},
      },
      version: 3,
    }));
  });
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
}

test.describe("checkout mobile ergonomics", () => {
  test("keeps mobile keyboard, autofill, validation focus, and submit reach stable", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile-chromium", "Mobile checkout ergonomics only needs mobile coverage.");
    await seedCheckoutCart(page);

    await page.goto("/checkout", { waitUntil: "domcontentloaded" });

    const email = page.getByLabel("Email address");
    const firstName = page.getByLabel("First name");
    const lastName = page.getByLabel("Last name");
    const phone = page.getByLabel("Mobile number");
    const address = page.getByLabel("Street address");
    const addressLine2 = page.getByLabel("Apt, suite, or villa number (optional)");
    const emirate = page.getByLabel("Emirate");
    const city = page.getByLabel("City / area");
    const submit = page.getByRole("button", { name: /Pay .* securely/i });

    await expect(email).toBeVisible();
    await expect(email).toHaveAttribute("type", "email");
    await expect(email).toHaveAttribute("inputmode", "email");
    await expect(email).toHaveAttribute("autocomplete", "email");
    await expect(firstName).toHaveAttribute("autocomplete", "given-name");
    await expect(lastName).toHaveAttribute("autocomplete", "family-name");
    await expect(phone).toHaveAttribute("type", "tel");
    await expect(phone).toHaveAttribute("inputmode", "tel");
    await expect(phone).toHaveAttribute("autocomplete", "tel");
    await expect(address).toHaveAttribute("autocomplete", "address-line1");
    await expect(addressLine2).toHaveAttribute("autocomplete", "address-line2");
    await expect(emirate).toHaveAttribute("autocomplete", "address-level1");
    await expect(city).toHaveAttribute("autocomplete", "address-level2");

    await submit.click();
    await expect(email).toBeFocused();
    await expect(email).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByRole("alert").filter({ hasText: "Enter a valid email address." })).toBeVisible();

    await submit.scrollIntoViewIfNeeded();
    const dimensions = await page.evaluate(() => ({
      viewportWidth: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
    }));
    expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.viewportWidth + 1);

    const box = await submit.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThanOrEqual(52);
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(dimensions.viewportWidth + 1);
  });

  test("shows readable recovery copy when checkout is blocked by inventory sync", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile-chromium", "Mobile checkout recovery only needs mobile coverage.");
    await seedBlockedCheckoutCart(page);
    await page.route("**/api/cart", async (route) => {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: "NETWORK_UNAVAILABLE" }),
      });
    });

    await page.goto("/checkout", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("alert").filter({ hasText: "Connection lost. Your cart is saved locally." })).toBeVisible();
    await expect(page.getByRole("alert").filter({ hasText: "Reconnect to reserve inventory before checkout." })).toBeVisible();
    await expect(page.getByRole("button", { name: /Pay .* securely/i })).toBeDisabled();
    await expect(page.getByRole("link", { name: "Return to cart" })).toBeVisible();
    await expect(page.getByText("NETWORK_UNAVAILABLE")).toHaveCount(0);

    const dimensions = await page.evaluate(() => ({
      viewportWidth: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
    }));
    expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.viewportWidth + 1);
  });
});
