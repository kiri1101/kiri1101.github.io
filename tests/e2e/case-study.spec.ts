import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type Worker } from "@playwright/test";
import matter from "gray-matter";
import { scrollForProject } from "../../app/lib/timeline";
import {
  canDrawScene,
  consoleErrors,
  live,
  mainThreadOnly,
  MODES,
  NO_SCENE_REASON,
  SCENE_CHUNK,
  scrollToP,
  SETTLE,
  WORKER_SCRIPT,
} from "./scene-helpers";
import { allowSoftwareGL, sceneOff } from "./scene-switch";

/** The projects as the content files define them, in their order (the app reads the same files at build time). */
const projects = readdirSync(join(process.cwd(), "content", "projects", "en"))
  .filter((f) => f.endsWith(".md"))
  .map((f) => matter(readFileSync(join(process.cwd(), "content", "projects", "en", f), "utf8")).data)
  .map((d) => ({ slug: String(d.slug), title: String(d.title), summary: String(d.summary), order: Number(d.order) }))
  .sort((a, b) => a.order - b.order);

const OWNER = "Jordan Tukum Folem";
const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Records every view transition the page starts and whether the browser animated it (the cross-fade), so a test
 * can tell a View Transition from a plain navigation. Must run before the page's scripts (addInitScript).
 */
async function recordViewTransitions(page: Page) {
  await page.addInitScript(() => {
    const start = Document.prototype.startViewTransition;
    if (typeof start !== "function") return;
    const log = { started: 0, animated: [] as number[] };
    (window as unknown as { __vt: typeof log }).__vt = log;
    Document.prototype.startViewTransition = function (this: Document, ...args: Parameters<typeof start>) {
      const t = start.apply(this, args);
      log.started++;
      t.ready
        .then(() => {
          const fades = document
            .getAnimations()
            .filter((a) => (a.effect as KeyframeEffect | null)?.pseudoElement?.startsWith("::view-transition"));
          log.animated.push(fades.length);
        })
        .catch(() => log.animated.push(-1));
      return t;
    } as typeof start;
  });
}

const vtLog = (page: Page) =>
  page.evaluate(() => (window as unknown as { __vt?: { started: number; animated: number[] } }).__vt ?? null);

/** Takes View Transitions away, as in browsers without them (older Firefox and Safari): plain navigation. */
async function withoutViewTransitions(page: Page) {
  await page.addInitScript(() => {
    delete (Document.prototype as Partial<Document>).startViewTransition;
  });
}

/** Scrolls the home page to project i, waits for the HUD to show it, and returns the scroll position. */
async function focusProject(page: Page, i: number): Promise<number> {
  await scrollToP(page, scrollForProject(i));
  await expect(page.locator("#hud")).toHaveCSS("visibility", "visible");
  await expect(page.locator("#title")).toHaveText(projects[i].title);
  return page.evaluate(() => window.scrollY);
}

test.describe("case-study pages", () => {
  for (const [i, p] of projects.entries()) {
    test(`/en/projects/${p.slug} is a prerendered page: 200, its title as h1, its metadata`, async ({ page, baseURL }) => {
      const res = await page.goto(`/en/projects/${p.slug}`);
      expect(res?.status()).toBe(200);
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.locator("h1")).toHaveText(p.title);
      await expect(page).toHaveTitle(`${p.title} — ${OWNER}`);
      await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", p.summary);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", new RegExp(`/en/projects/${p.slug}$`));
      await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
        "content",
        new RegExp(`/projects/${p.slug}/og\\.jpg$`),
      );
      await expect(page.getByText(`${pad(i + 1)} / ${pad(projects.length)}`)).toBeVisible();
      expect(new URL(page.url()).origin).toBe(new URL(baseURL!).origin);
    });
  }

  test("every image has a width, a height and a non-empty alt", async ({ page }) => {
    for (const p of projects) {
      await page.goto(`/en/projects/${p.slug}`);
      const imgs = page.locator("img");
      expect(await imgs.count(), p.slug).toBeGreaterThanOrEqual(2);
      for (const img of await imgs.all()) {
        const attrs = await img.evaluate((el) => ({
          width: el.getAttribute("width"),
          height: el.getAttribute("height"),
          alt: el.getAttribute("alt"),
          src: el.getAttribute("src"),
        }));
        expect(Number(attrs.width), `${p.slug} ${attrs.src} width`).toBeGreaterThan(0);
        expect(Number(attrs.height), `${p.slug} ${attrs.src} height`).toBeGreaterThan(0);
        expect(attrs.alt?.trim(), `${p.slug} ${attrs.src} alt`).toBeTruthy();
      }
    }
  });

  test("the hero image loads first; gallery images below it wait (lazy, sized)", async ({ page }) => {
    await page.goto("/en/projects/services-publics");
    const hero = page.locator("img").first();
    await expect(hero).toHaveAttribute("fetchpriority", "high");
    await expect(hero).not.toHaveAttribute("loading", "lazy");
    const rest = page.locator("img:not([fetchpriority])");
    expect(await rest.count()).toBe(1);
    for (const img of await rest.all()) await expect(img).toHaveAttribute("loading", "lazy");
  });

  test('"Next in orbit" links to the following project and wraps from the last to the first', async ({ page }) => {
    for (const [i, p] of projects.entries()) {
      const next = projects[(i + 1) % projects.length];
      await page.goto(`/en/projects/${p.slug}`);
      const link = page.getByRole("link", { name: /Next in orbit/ });
      await expect(link, p.slug).toHaveAttribute("href", `/en/projects/${next.slug}`);
      await expect(link).toContainText(next.title);
    }
    // And it navigates: from the last project to the first.
    await page.goto(`/en/projects/${projects.at(-1)!.slug}`);
    await page.getByRole("link", { name: /Next in orbit/ }).click();
    await expect(page).toHaveURL(new RegExp(`/en/projects/${projects[0].slug}$`));
    await expect(page.locator("h1")).toHaveText(projects[0].title);
    await expect(page).toHaveTitle(`${projects[0].title} — ${OWNER}`);
  });

  test("the case-study page loads no 3D scene: no canvas, no three.js, no worker", async ({ page }) => {
    const scripts: string[] = [];
    page.on("request", (r) => scripts.push(r.url()));
    const errors = consoleErrors(page);
    await page.goto("/en/projects/services-publics", { waitUntil: "networkidle" });
    await expect(page.locator("canvas")).toHaveCount(0);
    expect(scripts.filter((u) => /\/assets\/scene/.test(u))).toEqual([]);
    expect(page.workers()).toHaveLength(0);
    expect(errors).toEqual([]);
  });

  test("once idle, the page fetches the way home ahead: the home route, its serif face and poster, not its 3D scene", async ({
    page,
    browserName,
  }) => {
    test.skip(browserName === "webkit", "Safari has no <link rel=\"prefetch\"> (WebKit keeps it behind a flag)");
    await sceneOff(page);
    const requests: string[] = [];
    page.on("request", (r) => requests.push(new URL(r.url()).pathname));
    await page.goto("/en/projects/services-publics");
    const ahead = [
      /^\/assets\/_index-[\w-]+\.js$/,
      /^\/en\.data$/,
      /^\/assets\/instrument-serif-[\w-]+\.woff2$/,
      /^\/orb-poster\.avif$/,
    ];
    await expect.poll(() => ahead.filter((re) => !requests.some((u) => re.test(u))).map(String)).toEqual([]);
    expect(requests.filter((u) => /\/assets\/scene/.test(u))).toEqual([]);
    // Plain prefetches, not module preloads (see Nav.tsx): nothing of the home route runs on this page.
    expect(await page.locator('link[rel="modulepreload"][href*="/_index-"]').count()).toBe(0);
    // "Back to orbit" then takes the home route's module from the HTTP cache: nothing more is transferred for it.
    await page.getByRole("link", { name: "Back to orbit" }).click();
    await expect(page.locator("#title")).toHaveText(projects[0].title);
    const transfers = await page.evaluate(() =>
      performance
        .getEntriesByType("resource")
        .filter((e) => /\/assets\/_index-/.test(e.name))
        .map((e) => (e as PerformanceResourceTiming).transferSize),
    );
    expect(transfers.length).toBeGreaterThanOrEqual(1);
    expect(transfers.slice(1)).toEqual(transfers.slice(1).map(() => 0));
  });

  test("no serious axe violations", async ({ page }) => {
    await page.goto("/en/projects/services-publics");
    const { violations } = await new AxeBuilder({ page }).analyze();
    const blocking = violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(blocking.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
  });

  test("the facts, figures and captions are real HTML", async ({ page }) => {
    await page.goto("/en/projects/services-publics");
    for (const text of ["Lead developer", "2023 — present", "Ministry of Finance — Directorate General of Budget · delivered at ADWA SARL", "Laravel, Vue 3, Inertia (SSR), Laravel Echo, Docker"]) {
      await expect(page.getByText(text, { exact: true })).toBeAttached();
    }
    await expect(page.getByText("≈ 900", { exact: true })).toBeVisible();
    await expect(page.getByText("Keep business logic in Action classes rather than controllers, so it can be tested and reused across user journeys.")).toBeAttached();
  });

  test.describe("without JavaScript", () => {
    test.use({ javaScriptEnabled: false });

    test("the page is in the static HTML, images included", async ({ page }) => {
      await page.goto("/en/projects/bornes-libre-service");
      await expect(page.locator("h1")).toHaveText("Self-service kiosks");
      expect(await page.locator("img").count()).toBe(2);
      await expect(page.getByRole("link", { name: /Next in orbit/ })).toHaveAttribute("href", "/en/projects/ministere-fonction-publique");
    });
  });
});

test.describe("404", () => {
  test("/en/projects/does-not-exist is a 404 page", async ({ page }) => {
    const errors = consoleErrors(page, /\/en\/projects\/does-not-exist/);
    const res = await page.goto("/en/projects/does-not-exist");
    expect(res?.status()).toBe(404);
    await expect(page.locator("h1")).toHaveText("Page not found");
    await expect(page).toHaveTitle(`Page not found — ${OWNER}`);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex");
    await expect(page.getByRole("link", { name: "Back to orbit" })).toHaveAttribute("href", "/en");
    expect(errors).toEqual([]);
  });

  test("inside the app, a link to a project that does not exist shows the same page", async ({ page }) => {
    await page.goto("/en/projects/services-publics");
    // No link on the site points at a project that does not exist, so nothing a visitor can click gets there. The
    // test asks React Router's own router (window.__reactRouterDataRouter) for the same client-side navigation a stale
    // link would make. The router exists once the app has started (slower engines get there after the load event).
    type WithRouter = { __reactRouterDataRouter?: { navigate(to: string): Promise<void> } };
    await page.waitForFunction(() => !!(window as unknown as WithRouter).__reactRouterDataRouter);
    await page.evaluate(() => (window as unknown as WithRouter).__reactRouterDataRouter!.navigate("/en/projects/does-not-exist"));
    await expect(page.locator("h1")).toHaveText("Page not found");
    await expect(page).toHaveTitle(`Page not found — ${OWNER}`);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex");
  });

  test("an unknown path anywhere is the same 404 page", async ({ page }) => {
    const res = await page.goto("/en/nothing/here");
    expect(res?.status()).toBe(404);
    await expect(page.locator("h1")).toHaveText("Page not found");
  });

  test.describe("without JavaScript", () => {
    test.use({ javaScriptEnabled: false });

    test("the 404 page is static HTML", async ({ page }) => {
      const res = await page.goto("/en/projects/does-not-exist");
      expect(res?.status()).toBe(404);
      await expect(page.locator("h1")).toHaveText("Page not found");
    });
  });
});

test.describe("home ⇄ case study", () => {
  test.beforeEach(({ page }) => sceneOff(page));

  test('"Back to orbit" lands on that project in the galaxy, with nothing else left on screen', async ({ page }) => {
    await page.goto("/en/projects/bornes-libre-service");
    const back = page.getByRole("link", { name: "Back to orbit" });
    await expect(back).toHaveAttribute("href", "/en#bornes-libre-service");
    await back.click();
    await expect(page).toHaveURL(/\/en#bornes-libre-service$/);
    await expect(page.locator("#hud")).toHaveCSS("visibility", "visible");
    await expect(page.locator("#title")).toHaveText("Self-service kiosks");
    await expect(page.locator("#idx")).toHaveText(`02 / ${pad(projects.length)}`);
    for (const id of ["hero", "transit"]) await expect(page.locator(`#${id}`)).toHaveCSS("visibility", "hidden");
    await expect(page.locator("#list")).not.toHaveClass(/\bon\b/);
  });

  test('from the keyboard, "Back to orbit" leaves focus on the project\'s title in the HUD; a page load does not move it', async ({
    page,
  }) => {
    await page.goto("/en/projects/bornes-libre-service");
    await page.getByRole("link", { name: "Back to orbit" }).focus();
    await page.keyboard.press("Enter");
    const title = page.locator("#title");
    await expect(title).toHaveText("Self-service kiosks");
    await expect(title).toBeFocused();
    await expect(title).toHaveAttribute("tabindex", "-1");
    // A shared link to the same place, a new page load: the browser's own focus (the page), nothing moved.
    await page.goto("about:blank");
    await page.goto("/en#bornes-libre-service");
    await expect(title).toHaveText("Self-service kiosks");
    await expect(page.locator("#hud")).toHaveCSS("visibility", "visible");
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => document.activeElement?.tagName)).toBe("BODY");
  });

  test('the list marks the project "Back to orbit" came to, until the visitor picks another; it does not come back', async ({
    page,
  }) => {
    await page.goto("/en/projects/bornes-libre-service");
    await page.getByRole("link", { name: "Back to orbit" }).click();
    await expect(page.locator("#title")).toHaveText("Self-service kiosks");
    await page.getByRole("button", { name: "list", exact: true }).click();
    const marked = page.locator('#project-list a[aria-current="true"]');
    await expect(marked).toHaveCount(1);
    await expect(marked).toContainText("Self-service kiosks");
    // Picking another project flies the spiral to it: Self-service kiosks is no longer where the visitor is.
    await page.locator("#project-list a", { hasText: "Banking compliance" }).click();
    await expect(page.locator("#title")).toHaveText("Banking compliance");
    await expect(marked).toHaveCount(0);
    // Back on Self-service kiosks by scrolling, it is not "where you came from" any more.
    await focusProject(page, 1);
    await expect(marked).toHaveCount(0);
  });

  test("a deep link to a project opens the galaxy on it", async ({ page }) => {
    await page.goto("/en#conformite-bancaire");
    await expect(page.locator("#title")).toHaveText("Banking compliance");
    await expect(page.locator("#idx")).toHaveText(`04 / ${pad(projects.length)}`);
  });

  test.describe("without View Transitions (plain navigation, as in older Firefox and Safari)", () => {
    test.beforeEach(({ page }) => withoutViewTransitions(page));

    test("home → case study → back restores the home scroll position and the HUD shows the same project", async ({
      page,
    }) => {
      await page.goto("/en");
      // Setup check: the page really has no View Transitions, so the router navigates plainly.
      expect(await page.evaluate(() => typeof document.startViewTransition)).toBe("undefined");
      const y = await focusProject(page, 4);
      await page.locator("#hud-link").click();
      await expect(page).toHaveURL(new RegExp(`/en/projects/${projects[4].slug}$`));
      await expect(page.locator("h1")).toHaveText(projects[4].title);
      expect(await page.evaluate(() => window.scrollY)).toBe(0);
      await page.goBack();
      await expect(page).toHaveURL(/\/en$/);
      await expect(page.locator("#title")).toHaveText(projects[4].title);
      await expect(page.locator("#idx")).toHaveText(`05 / ${pad(projects.length)}`);
      expect(Math.abs((await page.evaluate(() => window.scrollY)) - y)).toBeLessThanOrEqual(2);
    });
  });

  test.describe("with View Transitions", () => {
    test.beforeEach(async ({ page }) => {
      await recordViewTransitions(page);
      await page.goto("about:blank");
      test.skip(!(await page.evaluate(() => typeof document.startViewTransition === "function")), "no View Transitions");
    });

    test("home → case study → back cross-fades, then restores the scroll position and the project", async ({ page }) => {
      await page.goto("/en");
      const y = await focusProject(page, 4);
      await page.locator("#hud-link").click();
      await expect(page.locator("h1")).toHaveText(projects[4].title);
      await expect.poll(async () => (await vtLog(page))?.animated.length).toBe(1);
      expect((await vtLog(page))!.animated[0]).toBeGreaterThan(0);
      await page.goBack();
      await expect(page.locator("#title")).toHaveText(projects[4].title);
      await expect.poll(async () => (await vtLog(page))?.animated.length).toBe(2);
      expect((await vtLog(page))!.animated[1]).toBeGreaterThan(0);
      expect(Math.abs((await page.evaluate(() => window.scrollY)) - y)).toBeLessThanOrEqual(2);
    });

    test("with reduced motion the navigation does not cross-fade", async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto("/en/projects/services-publics");
      await page.getByRole("link", { name: /Next in orbit/ }).click();
      await expect(page.locator("h1")).toHaveText("Self-service kiosks");
      // Either no transition was started, or it ran without animating anything.
      await expect.poll(async () => {
        const log = await vtLog(page);
        return log !== null && log.animated.length === log.started;
      }).toBe(true);
      expect((await vtLog(page))!.animated.every((n) => n === 0)).toBe(true);
    });
  });
});

/** The scene worker, once the page starts one. */
const sceneWorker = (page: Page): Promise<Worker> =>
  page.waitForEvent("worker", { predicate: (w) => WORKER_SCRIPT.test(w.url()), ...SETTLE });

/** Counts the page's WebGL contexts that are still alive (main-thread rendering). */
async function countContexts(page: Page) {
  await page.addInitScript(() => {
    const contexts: (WebGLRenderingContext | WebGL2RenderingContext)[] = [];
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
      const ctx = (getContext as (...a: unknown[]) => RenderingContext | null).call(this, type, ...rest);
      if (ctx && (type === "webgl2" || type === "webgl") && !contexts.includes(ctx as WebGL2RenderingContext)) {
        contexts.push(ctx as WebGL2RenderingContext);
      }
      return ctx;
    } as typeof getContext;
    (window as unknown as { __liveContexts: () => number }).__liveContexts = () =>
      contexts.filter((c) => !c.isContextLost()).length;
  });
}
const liveContexts = (page: Page) =>
  page.evaluate(() => (window as unknown as { __liveContexts: () => number }).__liveContexts());

test.describe("the 3D scene across navigation (Chromium)", () => {
  test.describe.configure({ timeout: 120_000 });

  test.beforeEach(async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "Ruling: covered in Chromium");
    await allowSoftwareGL(page);
    await page.goto("about:blank");
    test.skip(!(await canDrawScene(page)), NO_SCENE_REASON);
  });

  for (const mode of MODES) {
    test(`rendering ${mode === "worker" ? "from a worker" : "on the main thread"}: leaving home disposes the scene; coming back starts it cleanly`, async ({
      page,
    }) => {
      if (mode === "main thread") await mainThreadOnly(page);
      await countContexts(page);
      const errors = consoleErrors(page);
      const firstWorker = mode === "worker" ? sceneWorker(page) : null;
      await page.goto("/en");
      await live(page);
      const worker = await firstWorker;
      const workerClosed = worker ? new Promise<void>((resolve) => worker.on("close", () => resolve())) : null;
      await focusProject(page, 0);

      await page.locator("#hud-link").click();
      await expect(page.locator("h1")).toHaveText(projects[0].title);
      await expect(page.locator("canvas")).toHaveCount(0);
      if (workerClosed) {
        await workerClosed;
        expect(page.workers()).toHaveLength(0);
      } else {
        await expect.poll(() => liveContexts(page)).toBe(0);
      }

      const secondWorker = mode === "worker" ? sceneWorker(page) : null;
      await page.goBack();
      await live(page);
      await expect(page.locator("#title")).toHaveText(projects[0].title);
      if (secondWorker) {
        await secondWorker;
        expect(page.workers()).toHaveLength(1);
      } else {
        expect(await liveContexts(page)).toBe(1);
      }
      expect(errors).toEqual([]);
    });
  }

  test("main thread: a build that finishes after leaving home frees the context it made", async ({ page }) => {
    await mainThreadOnly(page);
    await countContexts(page);
    // Hold three.js back, so the build is still on its way when the page leaves.
    let release!: () => void;
    const held = new Promise<void>((resolve) => (release = resolve));
    let requested!: () => void;
    const chunkRequested = new Promise<void>((resolve) => (requested = resolve));
    await page.route(SCENE_CHUNK, async (route) => {
      requested();
      await held;
      await route.continue();
    });
    await page.goto("/en");
    await chunkRequested;
    // Leave home by a client-side navigation (the router's own, as the HUD link would, without scrolling to it).
    type WithRouter = { __reactRouterDataRouter: { navigate(to: string): Promise<void> } };
    await page.evaluate(() => (window as unknown as WithRouter).__reactRouterDataRouter.navigate("/en/projects/services-publics"));
    await expect(page.locator("h1")).toHaveText(projects[0].title);
    const chunkLoaded = page.waitForResponse(SCENE_CHUNK);
    release();
    await chunkLoaded;
    // Long enough for the late build to have made (and kept) a context on software WebGL.
    await page.waitForTimeout(4000);
    expect(await liveContexts(page)).toBe(0);
  });

  test("main thread: leaving while the scene is built on its context frees that context once, quietly", async ({
    page,
  }) => {
    await mainThreadOnly(page);
    await countContexts(page);
    await page.addInitScript(() => {
      // The moment the scene's own context is made (not the availability check's throwaway one), the page leaves
      // by a client-side navigation, as the HUD link would; the build is then on its way, on that context.
      const w = window as unknown as {
        __losses: number;
        __reactRouterDataRouter: { navigate(to: string): Promise<void> };
      };
      w.__losses = 0;
      const getContext = HTMLCanvasElement.prototype.getContext;
      let left = false;
      HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
        const ctx = (getContext as (...a: unknown[]) => RenderingContext | null).call(this, type, ...rest);
        if (ctx && type === "webgl2" && this.id === "scene") {
          const gl = ctx as WebGL2RenderingContext & { __counted?: true };
          if (!gl.__counted) {
            // Counts real losses: the browser hands out the same extension object every time, so it is wrapped once.
            gl.__counted = true;
            const ext = gl.getExtension("WEBGL_lose_context");
            if (ext) {
              const lose = ext.loseContext.bind(ext);
              ext.loseContext = () => {
                w.__losses++;
                lose();
              };
            }
          }
          if (!left) {
            left = true;
            setTimeout(() => void w.__reactRouterDataRouter.navigate("/en/projects/services-publics"), 0);
          }
        }
        return ctx;
      } as typeof getContext;
    });
    const errors = consoleErrors(page);
    const warnings: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "warning") warnings.push(m.text());
    });
    await page.goto("/en");
    await expect(page.locator("h1")).toHaveText(projects[0].title, SETTLE);
    // Long enough for the rest of the build to have run (or given up) on software WebGL.
    await page.waitForTimeout(4000);
    expect(await liveContexts(page)).toBe(0);
    expect(await page.evaluate(() => (window as unknown as { __losses: number }).__losses)).toBe(1);
    expect(errors).toEqual([]);
    // Leaving is not a failure: the page's "unavailable" warning is for a browser that cannot draw the scene. (Software
    // WebGL's own notices, from three.js and the driver, are this test machine's.)
    expect(warnings.filter((t) => /^Orbit:/.test(t))).toEqual([]);
  });

  for (const mode of MODES) {
    test(`${mode === "worker" ? "from a worker" : "on the main thread"}: arriving home through a view transition, the scene is built during the cross-fade and draws only after it (R35)`, async ({
      page,
    }) => {
      if (mode === "main thread") await mainThreadOnly(page);
      await page.addInitScript(() => {
        // A long cross-fade, so the build surely overlaps it.
        document.addEventListener("DOMContentLoaded", () => {
          const style = document.createElement("style");
          style.textContent =
            "::view-transition-old(root), ::view-transition-new(root) { animation-duration: 2.5s !important; }";
          document.head.append(style);
        });
        const w = window as unknown as { __vtFinished?: number; __drawingAt?: number };
        const start = Document.prototype.startViewTransition;
        if (typeof start === "function") {
          Document.prototype.startViewTransition = function (this: Document, ...args: Parameters<typeof start>) {
            const t = start.apply(this, args);
            t.finished.finally(() => {
              w.__vtFinished = performance.now();
            });
            return t;
          } as typeof start;
        }
        // "ramp" (a fade-in, announced a frame before its first frame) or "live": the scene is drawing.
        new MutationObserver(() => {
          const state = document.getElementById("scene")?.dataset.scene;
          if (w.__drawingAt === undefined && (state === "ramp" || state === "live")) w.__drawingAt = performance.now();
        }).observe(document, { subtree: true, attributes: true, attributeFilter: ["data-scene"] });
      });
      await page.goto("/en/projects/ministere-fonction-publique");
      await page.getByRole("link", { name: "Back to orbit" }).click();
      await live(page);
      const t = await page.evaluate((worker) => {
        const w = window as unknown as { __vtFinished?: number; __drawingAt?: number };
        // The build's first download: the worker's script, or (on the main thread) the three.js chunk.
        const first = worker ? /\/assets\/scene\.worker-[\w-]+\.js$/ : /\/assets\/scene-[\w-]+\.js$/;
        const build = performance.getEntriesByType("resource").find((r) => first.test(r.name));
        return { finished: w.__vtFinished, drawing: w.__drawingAt, buildStart: build?.startTime };
      }, mode === "worker");
      expect(t.finished, "a view transition ran").toBeDefined();
      expect(t.buildStart, "the scene is built while the cross-fade runs").toBeLessThan(t.finished!);
      expect(t.drawing, "nothing is drawn before the cross-fade has finished").toBeGreaterThan(t.finished!);
    });
  }
});

test.describe("names and focus", () => {
  test("the logo's accessible name contains its visible text (WCAG 2.5.3): JT on phones, the full name on desktop", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/en/projects/services-publics");
    const logo = page.locator(".cs-logo");
    await expect(logo.locator(".cs-narrow")).toBeVisible();
    expect(await logo.locator(".cs-narrow").innerText()).toBe("JT");
    await expect(logo).toHaveAccessibleName("JT Jordan Tukum Folem");
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(logo.locator(".cs-narrow")).toBeHidden();
    await expect(logo).toHaveAccessibleName("Jordan Tukum Folem");
  });

  test('"Back to orbit" where the scene gives up after the arrival: focus follows the spiral into the list', async ({
    page,
  }) => {
    // A browser without WebGL that the page finds out about late: from a worker that starts a second after the
    // arrival, when the spiral's HUD title has taken focus. The gallery then turns into the list (the HUD it leaves
    // is inert). Where there is no worker path (WebKit here), the page finds out at once and shows the list first.
    await page.route(WORKER_SCRIPT, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const response = await route.fetch();
      const noWebGL =
        "(() => { const g = OffscreenCanvas.prototype.getContext; OffscreenCanvas.prototype.getContext = " +
        'function (t, ...r) { return t === "webgl2" || t === "webgl" ? null : g.call(this, t, ...r); }; })();\n';
      await route.fulfill({ response, body: noWebGL + (await response.text()) });
    });
    await page.addInitScript(() => {
      const getContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
        if (type === "webgl2" || type === "webgl") return null;
        return (getContext as (...a: unknown[]) => RenderingContext | null).call(this, type, ...rest);
      } as typeof getContext;
    });
    await page.goto("/en/projects/bornes-libre-service");
    await page.getByRole("link", { name: "Back to orbit" }).focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("#scene")).toHaveAttribute("data-scene", "off");
    await expect(page.locator("#list")).toHaveClass(/\bon\b/);
    const marked = page.locator('#project-list a[aria-current="true"]');
    await expect(marked).toContainText("Self-service kiosks");
    await expect(marked).toBeFocused();
  });

  test("arriving by a link moves focus to the title; a page load does not", async ({ page }) => {
    await page.goto("/en/projects/services-publics");
    expect(await page.evaluate(() => document.activeElement?.tagName)).toBe("BODY");
    await page.getByRole("link", { name: /Next in orbit/ }).click();
    await expect(page.locator("h1")).toHaveText("Self-service kiosks");
    await expect(page.locator("h1")).toBeFocused();
    await expect(page.locator("h1")).toHaveAttribute("tabindex", "-1");
  });
});

test.describe("without the 3D scene (tier 2: reduced motion)", () => {
  test.use({ reducedMotion: "reduce" });

  test("Back to orbit marks the project in the list, and a title opens its case study", async ({ page }) => {
    await page.goto("/en/projects/bornes-libre-service");
    await page.getByRole("link", { name: "Back to orbit" }).click();
    await expect(page).toHaveURL(/\/en#bornes-libre-service$/);
    await expect(page.locator("#list")).toHaveClass(/\bon\b/);
    const current = page.locator('#project-list a[aria-current="true"]');
    await expect(current).toHaveCount(1);
    await expect(current).toContainText("Self-service kiosks");
    await expect(current).toBeVisible();
    // The marker is visible: warm, with a dot before the title.
    expect(await current.evaluate((a) => getComputedStyle(a, "::before").content)).toBe('""');
    await page.locator("#project-list a", { hasText: "Banking compliance" }).click();
    await expect(page).toHaveURL(/\/en\/projects\/conformite-bancaire$/);
    await expect(page.locator("h1")).toHaveText("Banking compliance");
  });

  test("the marker clears once the visitor scrolls on to another project, and does not come back", async ({ page }) => {
    await page.goto("/en/projects/bornes-libre-service");
    await page.getByRole("link", { name: "Back to orbit" }).click();
    const marked = page.locator('#project-list a[aria-current="true"]');
    await expect(marked).toHaveCount(1);
    await scrollToP(page, scrollForProject(4));
    await expect(page.locator("#title")).toHaveText(projects[4].title);
    await expect(marked).toHaveCount(0);
    await scrollToP(page, scrollForProject(1));
    await expect(page.locator("#title")).toHaveText("Self-service kiosks");
    await expect(marked).toHaveCount(0);
  });

  test('from the keyboard, "Back to orbit" leaves focus on the marked project in the list', async ({ page, browserName }) => {
    await page.goto("/en/projects/bornes-libre-service");
    await page.getByRole("link", { name: "Back to orbit" }).focus();
    await page.keyboard.press("Enter");
    const marked = page.locator('#project-list a[aria-current="true"]');
    await expect(marked).toContainText("Self-service kiosks");
    await expect(marked).toBeFocused();
    // Tab goes on from there, down the list. (Safari's Tab skips links unless the visitor turns that on; Option-Tab
    // reaches them, which Playwright's WebKit does not emulate.)
    if (browserName === "webkit") return;
    await page.keyboard.press("Tab");
    await expect(page.locator("#project-list a", { hasText: projects[2].title })).toBeFocused();
  });
});

// ---------- every project, in both languages ----------

const HEADINGS = { fr: ["Le problème", "La solution", "Le résultat"], en: ["The problem", "The fix", "The result"] } as const;
const LABELS = { fr: { arch: "Architecture", decision: "Décision clé", back: "Retour à l’orbite" }, en: { arch: "Architecture", decision: "Key decision", back: "Back to orbit" } } as const;

for (const lang of ["fr", "en"] as const) {
  const dir = join(process.cwd(), "content", "projects", lang);
  const own = readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => matter(readFileSync(join(dir, f), "utf8")).data)
    .sort((a, b) => a.order - b.order);

  test.describe(`all ${own.length} case studies in ${lang}`, () => {
    test("there are nine", () => expect(own).toHaveLength(9));

    for (const [i, d] of own.entries()) {
      const path = lang === "fr" ? `/projets/${d.slug}` : `/en/projects/${d.slug}`;
      test(`${path}: title, facts, figures, the three story blocks, architecture and key decision`, async ({ page }) => {
        const errors = consoleErrors(page);
        const res = await page.goto(path);
        expect(res!.status()).toBe(200);
        await expect(page.locator("html")).toHaveAttribute("lang", lang);
        await expect(page.locator("h1")).toHaveText(d.title);
        await expect(page.locator(".cs-idx")).toHaveText(`${pad(i + 1)} / ${pad(own.length)}`);
        await expect(page.locator(".cs-meta dd").nth(0)).toHaveText(d.role);
        await expect(page.locator(".cs-meta dd").nth(1)).toHaveText(d.timeline);
        await expect(page.locator(".cs-meta dd").nth(2)).toHaveText(d.team);
        await expect(page.locator(".cs-meta dd").nth(3)).toHaveText(d.platforms);
        await expect(page.locator(".cs-stats li")).toHaveCount(d.stats.length);
        await expect(page.locator(".cs-body h2")).toHaveText([...HEADINGS[lang]]);
        await expect(page.locator(".cs-body p").first()).toBeVisible();
        await expect(page.locator(".cs-layers li")).toHaveCount(d.architecture.length);
        await expect(page.locator(".cs-story .cs-kicker", { hasText: LABELS[lang].arch })).toHaveCount(1);
        await expect(page.locator(".cs-decision")).toHaveCount(d.keyDecision ? 1 : 0);
        if (d.keyDecision) await expect(page.locator(".cs-decision")).toHaveText(d.keyDecision);
        await expect(page.locator(".cs-links li")).toHaveCount(d.links.length);
        await expect(page.getByRole("link", { name: LABELS[lang].back })).toBeVisible();
        const next = own[(i + 1) % own.length];
        await expect(page.locator(".cs-next a")).toHaveAttribute("href", lang === "fr" ? `/projets/${next.slug}` : `/en/projects/${next.slug}`);
        expect(errors).toEqual([]);
      });
    }
  });
}
