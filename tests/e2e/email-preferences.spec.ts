import { expect, test } from "@playwright/test";

test("newsletter consent can be managed and restored", async ({ page, request }, testInfo) => {
  const email = `newsletter-${testInfo.project.name}@example.com`;
  const signup = await request.post("/api/newsletter", {
    multipart: { email, source: "playwright" },
  });
  expect(signup.ok()).toBe(true);
  const signupResult = await signup.json() as { preferencesUrl: string };

  await page.goto(signupResult.preferencesUrl);
  await expect(page.getByText(email)).toBeVisible();
  await page.getByRole("button", { name: "Unsubscribe from all" }).click();
  await expect(page.getByRole("status")).toContainText("unsubscribed");
  await expect(page.getByRole("button", { name: "Resubscribe" })).toBeVisible();
  await page.getByRole("button", { name: "Resubscribe" }).click();
  await expect(page.getByRole("status")).toContainText("Preferences saved");
  await expect(page.getByRole("button", { name: "Save preferences" })).toBeVisible();
});
