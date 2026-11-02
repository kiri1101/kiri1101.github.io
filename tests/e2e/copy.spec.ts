import { expect, test } from "@playwright/test";
import { site } from "../../app/site.config";
import { expectSceneOff, sceneOff } from "./scene-switch";

test.beforeEach(({ page }) => sceneOff(page));
test.afterEach(expectSceneOff);

// M2: the "Copy" tag is a real button; the address next to it stays a mailto link.
test("the Copy button writes the address to the clipboard and says so, from the keyboard too", async ({ page }) => {
  await page.addInitScript(() => {
    (window as Window & { __copied?: string }).__copied = "";
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: async (t: string) => void ((window as Window & { __copied?: string }).__copied = t) },
    });
  });
  await page.goto("/en");
  const row = page.locator(".direct-email");
  await expect(row.getByRole("link", { name: site.owner.email })).toHaveAttribute("href", `mailto:${site.owner.email}`);
  const button = row.locator("button.tag");
  await button.focus();
  await page.keyboard.press("Enter");
  await expect(row.getByRole("status")).toHaveText("Email address copied");
  await expect(button).toHaveText("Copied");
  expect(await page.evaluate(() => (window as Window & { __copied?: string }).__copied)).toBe(site.owner.email);
});

test("without the clipboard API it falls back to a text selection copy", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: undefined });
    let copied = "";
    document.execCommand = (cmd: string) => {
      if (cmd === "copy") copied = (document.activeElement as HTMLTextAreaElement | null)?.value ?? "";
      (window as Window & { __copied?: string }).__copied = copied;
      return true;
    };
  });
  await page.goto("/en");
  await page.locator(".direct-email").getByRole("button", { name: "Copy" }).click();
  await expect(page.locator(".direct-email").getByRole("status")).toHaveText("Email address copied");
  expect(await page.evaluate(() => (window as Window & { __copied?: string }).__copied)).toBe(site.owner.email);
});
