import { expect, test, type Page } from "@playwright/test";
import { scrollForProject } from "../../app/lib/timeline";
import { expectSceneOff, sceneOff } from "./scene-switch";

// The list view, with the 3D scene out (scene.spec.ts covers the scene).
test.beforeEach(({ page }) => sceneOff(page));
test.afterEach(expectSceneOff);

const settle = { timeout: 15_000 };

async function scrollToP(page: Page, P: number) {
  const unit = await page.evaluate(() => document.getElementById("unit-probe")!.getBoundingClientRect().height);
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), P * unit);
}

async function openList(page: Page) {
  await page.goto("/en");
  await scrollToP(page, scrollForProject(0));
  await expect(page.locator("#toggle")).toHaveClass(/\bon\b/, settle);
  await page.locator('#toggle [data-view="list"]').click();
  await expect(page.locator("#list")).toHaveClass(/\bon\b/);
  await expect(page.locator("#list")).toHaveCSS("opacity", "1", settle);
}

// I2: on a short viewport every title can be reached, and none sits under the switch or the credit.
for (const size of [
  { width: 1366, height: 640 },
  { width: 844, height: 390 },
]) {
  test.describe(`list view at ${size.width}x${size.height}`, () => {
    test.use({ viewport: size });

    test("every title scrolls into view and is the topmost thing at its centre; the first is clear of the switch", async ({ page }) => {
      await openList(page);
      const links = page.locator("#project-list a");
      await expect(links).toHaveCount(11);
      for (let i = 0; i < 9; i++) {
        const link = links.nth(i);
        await link.scrollIntoViewIfNeeded();
        await expect(link).toBeInViewport({ ratio: 1 });
        const topmost = await link.evaluate((a) => {
          const r = a.getBoundingClientRect();
          const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
          return hit === a || a.contains(hit);
        });
        expect(topmost, `title ${i + 1} is covered`).toBe(true);
      }
      // At the top of the list the first title ends below the switch.
      await page.locator("#list").evaluate((el) => el.scrollTo({ top: 0 }));
      const gap = await page.evaluate(() => {
        const first = document.querySelector("#project-list a")!.getBoundingClientRect();
        const bar = document.getElementById("toggle")!.getBoundingClientRect();
        return first.top - bar.bottom;
      });
      expect(gap).toBeGreaterThan(0);
    });
  });
}

// I3: closed, the list is hidden by clipping, so assistive technology still finds every project link.
test.describe("the closed list", () => {
  test("its links are in the accessibility tree, are not tab stops, and open the case study", async ({ page }) => {
    await page.goto("/en");
    const list = page.locator("#list");
    await expect(list).not.toHaveClass(/\bon\b/);
    await expect(list.getByRole("link")).toHaveCount(11);
    await expect(list.getByRole("link").first()).toHaveAttribute("tabindex", "-1");

    // Tab through the page: focus never lands in the closed list.
    const inList: boolean[] = [];
    for (let i = 0; i < 25; i++) {
      await page.keyboard.press("Tab");
      inList.push(await page.evaluate(() => !!document.activeElement?.closest("#list")));
    }
    expect(inList).not.toContain(true);

    // A reading-cursor activation (focus, then Enter) follows the href.
    await list.getByRole("link").nth(1).focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/en\/projects\/[a-z0-9-]+$/);
    await page.goto("/en"); // the scene check in afterEach reads the home page
  });

  test("open, its links are tab stops and a click stays on the page", async ({ page }) => {
    await openList(page);
    await expect(page.locator("#project-list a").first()).not.toHaveAttribute("tabindex", /.*/);
    await page.locator("#project-list a").nth(2).click();
    await expect(page).toHaveURL(/\/en$/);
    await expect(page.locator("#list")).not.toHaveClass(/\bon\b/);
  });
});
