import { expect, test } from "@playwright/test";
import { site } from "../../app/site.config";
import { COUNT } from "./projects";

// M5: the page as a visitor without JavaScript (or a crawler that does not run it) gets it.
test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("the project list is an ordinary section, every title a link, and the scroll track is collapsed", async ({ page }) => {
    await page.goto("/en");
    await expect(page.locator("#list")).toBeVisible();
    const links = page.locator('#project-list a[href^="/en/projects/"]');
    await expect(links).toHaveCount(COUNT);
    await expect(links.first()).toBeVisible();
    await expect(links.last()).toBeVisible();
    // Not a dozen empty screens: the track has no height and the whole page is a few screens long.
    await expect(page.locator("#track")).toHaveCSS("display", "none");
    const { total, screen } = await page.evaluate(() => ({ total: document.documentElement.scrollHeight, screen: innerHeight }));
    expect(total).toBeLessThan(screen * 8);
  });

  test("the form is left out and the direct email link stands; its markup can never put fields in a URL", async ({ page }) => {
    await page.goto("/en");
    const form = page.locator("form.cf");
    await expect(form).toHaveAttribute("method", "post");
    await expect(form).toHaveAttribute("action", "/api/contact");
    await expect(form).toBeHidden();
    await expect(page.getByRole("link", { name: site.owner.email })).toBeVisible();
    await expect(page.locator(".direct .tag")).toBeHidden(); // Copy needs a script
  });
});

// M4: what a link preview or a crawler reads from the page's source.
test("the home page names its canonical URL and its share card", async ({ request }) => {
  const html = await (await request.get("/")).text();
  expect(html).toContain(`<link rel="canonical" href="${site.origin}/"`);
  for (const tag of ['property="og:title"', 'property="og:description"', 'property="og:url"', 'property="og:image"', 'name="twitter:card"']) {
    expect(html, tag).toContain(tag);
  }
});
