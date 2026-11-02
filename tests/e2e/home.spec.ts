import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { expectSceneOff, sceneOff } from "./scene-switch";

// Tests about the DOM layers run without the 3D scene; scene.spec.ts covers it.
test.beforeEach(({ page }) => sceneOff(page));
test.afterEach(expectSceneOff);

test("every project is a real link with a heading", async ({ page }) => {
  await page.goto("/en");
  await expect(page.locator('#project-list a[href^="/en/projects/"]')).toHaveCount(9);
  await expect(page.getByText("Nine projects, 2023 – 2026")).toBeAttached();
});

test("the French home counts its projects and states the real profile", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('#project-list a[href^="/projets/"]')).toHaveCount(9);
  await expect(page.getByText("Neuf projets, 2023 – 2026")).toBeAttached();
  await expect(page.locator("h1")).toHaveText(/Développeur Full Stack/);
  await expect(page.locator(".facts")).toContainText("Douala, Cameroun");
  // The years of experience are computed from the earliest role (2020) and the build year, not typed.
  await expect(page.locator(".facts")).toContainText(`${new Date().getFullYear() - 2020} ans`);
  await expect(page.locator(".exp li")).toHaveCount(4 + 3 + 3 + 2);
  await expect(page.locator(".cv-link")).toHaveAttribute("href", "/cv/CV_Jordan_TUKUM_FOLEM_FR.pdf");
  await expect(page.locator(".direct-email a")).toHaveText("jtukum@outlook.com");
});

test("the English home links the English CV", async ({ page }) => {
  await page.goto("/en");
  await expect(page.locator(".cv-link")).toHaveAttribute("href", "/cv/CV_Jordan_TUKUM_FOLEM_EN.pdf");
  await expect(page.locator(".facts")).toContainText(`${new Date().getFullYear() - 2020} years`);
});

test("no serious axe violations", async ({ page }) => {
  await page.goto("/en");
  const { violations } = await new AxeBuilder({ page }).analyze();
  const blocking = violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(blocking.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
});

test("credit is present", async ({ page }) => {
  await page.goto("/en");
  await expect(page.getByText("Webb's First Deep Field · NASA, ESA, CSA, STScI").first()).toBeAttached();
});

test("exposes the layer ids later tasks rely on", async ({ page }) => {
  await page.goto("/en");
  for (const id of [
    "studio", "space", "glow", "floor", "horizon", "hero", "orb-poster", "transit", "hud",
    "toggle", "list", "project-list", "outro", "about", "contact", "contact-form-slot", "scene", "track", "space-credit",
  ]) {
    await expect(page.locator(`#${id}`), `#${id}`).toHaveCount(1);
  }
  await expect(page.locator("#scene")).toHaveAttribute("aria-hidden", "true");
});

test("self-hosted fonts only; no Google Fonts", async ({ page, baseURL }) => {
  const hosts = new Set<string>();
  page.on("request", (r) => hosts.add(new URL(r.url()).host));
  await page.goto("/en", { waitUntil: "networkidle" });
  expect([...hosts]).toEqual([new URL(baseURL!).host]);
});

test.describe("fonts and caching", () => {
  const YEAR = "public, max-age=31536000, immutable";
  const REVALIDATE = "public, max-age=0, must-revalidate";

  for (const path of ["/", "/en/projects/services-publics"]) {
    test(`${path}: one font preload, of the fingerprinted file its stylesheet uses, cached for a year`, async ({ request }) => {
      const html = await (await request.get(path)).text();
      const preloads = (html.match(/<link[^>]*rel="preload"[^>]*>/g) ?? []).filter((l) => l.includes('as="font"'));
      expect(preloads).toHaveLength(1);
      const href = preloads[0].match(/href="([^"]+)"/)![1];
      expect(href).toMatch(/^\/assets\/inter-tight-latin-wght-normal-[\w-]+\.woff2$/);
      // The stylesheet's face is the same URL, so the preload is what the page uses (no second download).
      const css = html.match(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"/)![1];
      const stylesheet = await (await request.get(css)).text();
      const faces = [...stylesheet.matchAll(/url\(([^)]+\.woff2)\)/g)].map((m) => m[1].replace(/["']/g, ""));
      expect(faces).toContain(href);
      for (const face of faces) expect(face).toMatch(/^\/assets\/[\w-]+\.woff2$/);
      expect((await request.get(href)).headers()["cache-control"]).toBe(YEAR);
    });
  }

  test("the host's headers: /assets/* for a year; pages and other files revalidated; _headers itself not served", async ({
    request,
  }) => {
    const html = await (await request.get("/")).text();
    const script = html.match(/<link rel="modulepreload"[^>]*href="([^"]+)"/)![1];
    expect(script).toMatch(/^\/assets\/[\w-]+\.js$/);
    expect((await request.get(script)).headers()["cache-control"]).toBe(YEAR);
    expect((await request.get("/")).headers()["cache-control"]).toBe(REVALIDATE);
    expect((await request.get("/orb-poster.avif")).headers()["cache-control"]).toBe(REVALIDATE);
    expect((await request.get("/_headers")).status()).toBe(404);
  });
});

const SPACE_IMAGE = /\/space\/deep-field-dim\.(avif|webp)$/;
const SERIF_FACE = /\/assets\/instrument-serif-[\w-]+\.woff2$/;

test("the first screen loads first: scripts preload at low priority, space and the serif face wait for the first paint", async ({
  page,
  request,
}) => {
  const html = await (await request.get("/")).text();
  const preloads = html.match(/<link rel="modulepreload"[^>]*>/g) ?? [];
  expect(preloads.length).toBeGreaterThan(0);
  for (const link of preloads) expect(link).toContain('fetchpriority="low"');

  await page.goto("/en");
  await expect(page.locator("html")).toHaveAttribute("data-late", "");
  const timing = () =>
    page.evaluate(() => ({
      fcp: performance.getEntriesByType("paint").find((e) => e.name === "first-contentful-paint")?.startTime ?? null,
      starts: performance.getEntriesByType("resource").map((r) => ({ url: r.name, start: r.startTime })),
    }));
  await expect
    .poll(async () => {
      const { starts } = await timing();
      return [SPACE_IMAGE, SERIF_FACE].every((re) => starts.some((s) => re.test(s.url)));
    })
    .toBe(true);
  const { fcp, starts } = await timing();
  test.skip(fcp === null, "this browser does not report paint timing");
  for (const re of [SPACE_IMAGE, SERIF_FACE]) {
    expect(starts.find((s) => re.test(s.url))!.start, String(re)).toBeGreaterThanOrEqual(fcp!);
  }
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("the page is prerendered into the static HTML", async ({ page }) => {
    await page.goto("/en");
    await expect(page.locator("h1")).toHaveText(/Full Stack Developer/);
    await expect(page.locator('#project-list a[href^="/en/projects/"]')).toHaveCount(9);
  });

  test("nothing waits for a first paint that no script observes: space and the serif face load with the page", async ({
    page,
  }) => {
    const urls: string[] = [];
    page.on("request", (r) => urls.push(r.url()));
    await page.goto("/en", { waitUntil: "load" });
    await expect.poll(() => [SPACE_IMAGE, SERIF_FACE].every((re) => urls.some((u) => re.test(u)))).toBe(true);
    await expect(page.locator("html")).not.toHaveAttribute("data-defer");
  });
});

for (const [lang, path] of [["fr", "/"], ["en", "/en"]] as const) {
  for (const width of [360, 390]) {
    test(`[${lang}] the header stays on one line at ${width}px: JT on phones, the full name in the accessible name`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.goto(path);
      const logo = page.locator(".site-header .logo");
      // One line: the box is shorter than two lines of its own text.
      const oneLine = (sel: string) =>
        page.locator(sel).evaluate((el) => el.getBoundingClientRect().height < 1.5 * parseFloat(getComputedStyle(el).fontSize) * 1.4);
      expect(await oneLine(".site-header .logo")).toBe(true);
      expect(await oneLine('.site-header nav a[href="#contact"]')).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
      expect(await logo.locator(".logo-narrow").innerText()).toBe("JT");
      await expect(logo).toHaveAccessibleName("JT Jordan Tukum Folem");
    });
  }
}

test("the header shows the full name on desktop", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/en");
  await expect(page.locator(".site-header .logo .logo-narrow")).toBeHidden();
  await expect(page.locator(".site-header .logo")).toHaveAccessibleName("Jordan Tukum Folem");
});
