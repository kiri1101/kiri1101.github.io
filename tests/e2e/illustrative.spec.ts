import { expect, test } from "@playwright/test";

/** The projects whose images are illustrative mock-ups (decision D5): every figure on their page carries the caption. */
const ILLUSTRATIVE = ["ministere-fonction-publique", "conformite-bancaire", "tv-satellite", "schulyf", "drymhome"];
const NOT = ["services-publics", "bornes-libre-service", "equip4safety", "orbit-portfolio"];

const LOCALES = [
  { path: (slug: string) => `/projets/${slug}`, label: "Maquette illustrative", alt: /^Maquette illustrative/ },
  { path: (slug: string) => `/en/projects/${slug}`, label: "Illustrative mock-up", alt: /^Illustrative mock-up/ },
];

for (const l of LOCALES) {
  test.describe(`${l.label}`, () => {
    for (const slug of ILLUSTRATIVE) {
      test(`${l.path(slug)}: every figure carries the caption and its alt says so`, async ({ page }) => {
        await page.goto(l.path(slug));
        const figures = page.locator("figure.cs-shot");
        const count = await figures.count();
        expect(count).toBeGreaterThanOrEqual(2);
        for (let i = 0; i < count; i++) {
          await expect(figures.nth(i)).toContainText(l.label);
          await expect(figures.nth(i).locator("img")).toHaveAttribute("alt", l.alt);
        }
      });
    }
    for (const slug of NOT) {
      test(`${l.path(slug)}: real screens carry no such caption`, async ({ page }) => {
        await page.goto(l.path(slug));
        await expect(page.locator("figure.cs-shot", { hasText: l.label })).toHaveCount(0);
      });
    }
  });
}
