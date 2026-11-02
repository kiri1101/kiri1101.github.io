import { expect, test } from "@playwright/test";

test("home is prerendered static HTML with a level-1 heading", async ({ page }) => {
  const res = await page.goto("/");
  expect(res?.status()).toBe(200);
  await expect(page.locator("h1")).toHaveCount(1);
});
