/**
 * The 3D scene's fallbacks (Task 7): the still poster and the list view (tier 2) without capable WebGL or with
 * reduced motion; rendering from a worker, and on the main thread where the worker path is unavailable (Ruling
 * R27); the monogram's font in the worker; adaptive quality.
 */
import { test, type Page, type Worker } from "@playwright/test";
import { scrollForProject } from "../../app/lib/timeline";
import { COUNT } from "./projects";
import {
  canDrawScene,
  canRenderInWorker,
  NO_WORKER_GL_REASON,
  canvasInk,
  consoleErrors,
  expect,
  live,
  mainThreadOnly,
  MODES,
  NO_SCENE_REASON,
  SCENE_CHUNK,
  sceneState,
  scrollToP,
  SETTLE,
  workerPrelude,
  WORKER_SCRIPT,
  type Mode,
} from "./scene-helpers";
import { allowSoftwareGL } from "./scene-switch";

test.describe.configure({ timeout: 150_000 });

/** Requests for the 3D code, from the page or a worker: the three.js chunk, and the worker's own script. */
function sceneRequests(page: Page): { chunks: string[]; all: string[] } {
  const requested = { chunks: [] as string[], all: [] as string[] };
  page.on("request", (r) => {
    if (SCENE_CHUNK.test(r.url())) requested.chunks.push(r.url());
    if (SCENE_CHUNK.test(r.url()) || WORKER_SCRIPT.test(r.url())) requested.all.push(r.url());
  });
  return requested;
}

/** Whether three.js was evaluated on the main thread (it registers itself on `window`; a worker has none). */
const threeOnMainThread = (page: Page) => page.evaluate(() => "__THREE__" in window);

/**
 * Tier 2: the page settles on its poster and draws nothing, the gallery is the list view, and the page scrolls
 * through to the closing sections, with no console errors and none of the `requested` 3D code downloaded.
 */
async function expectStillPage(page: Page, errors: string[], requested: string[]) {
  await page.goto("/en");
  await sceneState(page, "off");
  await expect(page.locator("#scene")).toHaveAttribute("data-tier", "2");
  await expect(page.locator("#orb-poster")).toBeVisible();
  await expect(page.locator("#orb-poster")).toHaveCSS("visibility", "visible");
  await expect(page.locator("h1")).toBeVisible();
  await expect(page.locator("#list")).not.toHaveClass(/\bon\b/); // the list belongs to the gallery, not over the hero
  // No canvas drawing: with every other layer hidden, nothing is lit.
  expect(await canvasInk(page)).toBeLessThan(0.0005);

  // In the gallery the list view stands in for the spiral.
  await scrollToP(page, scrollForProject(0));
  await expect(page.locator("#list")).toHaveClass(/\bon\b/, SETTLE);
  const titles = page.locator("#project-list a");
  await expect(titles).toHaveCount(COUNT);
  for (let i = 0; i < COUNT; i++) await expect(titles.nth(i)).toBeVisible();
  await expect(page.getByRole("button", { name: "list", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#hud")).toHaveJSProperty("inert", true);
  expect(await canvasInk(page)).toBeLessThan(0.0005);

  // The page scrolls on to the closing sections, which are not covered.
  await page.locator("#contact").scrollIntoViewIfNeeded();
  await expect(page.locator("#contact")).toBeInViewport();
  await expect(page.locator("#list")).not.toHaveClass(/\bon\b/, SETTLE);
  expect(await page.evaluate(() => scrollY)).toBeGreaterThan(0);

  expect(requested).toEqual([]);
  expect(await threeOnMainThread(page)).toBe(false);
  expect(errors).toEqual([]);
}

test.describe("tier 2: the still poster and the list view", () => {
  // The software-WebGL switch is on, so only the condition under test can keep the scene off.
  test.beforeEach(({ page }) => allowSoftwareGL(page));

  test("reduced motion", async ({ page }) => {
    const errors = consoleErrors(page);
    const requested = sceneRequests(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
    // Decided before anything loads: not even the worker starts.
    await expectStillPage(page, errors, requested.all);
  });

  test("no WebGL", async ({ playwright, browserName, viewport, deviceScaleFactor, isMobile, hasTouch, userAgent, baseURL }) => {
    // A browser with no WebGL anywhere, for this test only, like a device whose GPU is blocklisted:
    // - Chromium: --disable-3d-apis takes WebGL from <canvas> elements only, and OffscreenCanvas (so a worker) keeps
    //   it, so the GPU and its software fallback are switched off too;
    // - Firefox: webgl.disabled, which covers OffscreenCanvas and workers;
    // - Playwright's WebKit on Windows cannot draw the scene at all (no OffscreenCanvas), so it runs as it is; on Linux
    //   it has WebGL and cannot be launched without it, so the test skips.
    const browser = await playwright[browserName].launch(
      browserName === "chromium"
        ? { args: ["--disable-3d-apis", "--disable-gpu", "--disable-software-rasterizer"] }
        : browserName === "firefox"
          ? { firefoxUserPrefs: { "webgl.disabled": true } }
          : {},
    );
    try {
      const context = await browser.newContext({ viewport, deviceScaleFactor, isMobile, hasTouch, userAgent, baseURL });
      const page = await context.newPage();
      await allowSoftwareGL(page);
      const errors = consoleErrors(page);
      const requested = sceneRequests(page);
      await page.goto("about:blank");
      const webgl = await page.evaluate(() => ({
        element: !!document.createElement("canvas").getContext("webgl2"),
        offscreen: typeof OffscreenCanvas !== "undefined" && !!new OffscreenCanvas(1, 1).getContext("webgl2"),
      }));
      // Playwright's WebKit has no switch for turning WebGL off: Windows has none to begin with, Linux always has it.
      test.skip(browserName === "webkit" && (webgl.element || webgl.offscreen), "this WebKit build cannot be launched without WebGL");
      expect(webgl).toEqual({ element: false, offscreen: false });
      // A worker may start and find no WebGL; three.js is never downloaded.
      await expectStillPage(page, errors, requested.chunks);
    } finally {
      await browser.close();
    }
  });
});

test.describe("where the scene renders", () => {
  test.beforeEach(async ({ page }) => {
    await allowSoftwareGL(page);
    await page.goto("about:blank");
    test.skip(!(await canDrawScene(page)), NO_SCENE_REASON);
  });

  test("in a worker, where the browser can hand it the canvas: three.js never runs on the main thread", async ({
    page,
  }) => {
    test.skip(!(await canRenderInWorker(page)), NO_WORKER_GL_REASON);
    const errors = consoleErrors(page);
    const worker = page.waitForEvent("worker", { predicate: (w) => WORKER_SCRIPT.test(w.url()), ...SETTLE });
    await page.goto("/en");
    await worker;
    await live(page);
    await expect.poll(() => canvasInk(page), SETTLE).toBeGreaterThan(0.01);
    expect(await threeOnMainThread(page)).toBe(false);
    expect(errors).toEqual([]);
  });

  test("on the main thread without transferControlToOffscreen (Ruling R27)", async ({ page }) => {
    await mainThreadOnly(page);
    const errors = consoleErrors(page);
    const workers: Worker[] = [];
    page.on("worker", (w) => workers.push(w));
    await page.goto("/en");
    await live(page);
    await expect.poll(() => canvasInk(page), SETTLE).toBeGreaterThan(0.01);
    expect(await threeOnMainThread(page)).toBe(true);
    expect(workers).toEqual([]);
    expect(errors).toEqual([]);
  });

  test("on the main thread when the worker's script cannot load", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "the worker's failure path is exercised in Chromium");
    test.skip(!(await canRenderInWorker(page)), NO_WORKER_GL_REASON);
    const errors = consoleErrors(page, WORKER_SCRIPT);
    let refused = 0;
    await page.route(WORKER_SCRIPT, (route) => {
      refused++;
      return route.fulfill({ status: 404, body: "" });
    });
    await page.goto("/en");
    await live(page);
    expect(refused).toBe(1);
    await expect.poll(() => canvasInk(page), SETTLE).toBeGreaterThan(0.01);
    expect(await threeOnMainThread(page)).toBe(true);
    expect(errors).toEqual([]);
  });

  test("on the main thread when the worker gets no WebGL 2 context: it asks before the canvas is transferred", async ({
    page,
  }) => {
    test.skip(!(await canRenderInWorker(page)), NO_WORKER_GL_REASON);
    await workerPrelude(page, () => {
      const original = OffscreenCanvas.prototype.getContext;
      OffscreenCanvas.prototype.getContext = function (this: OffscreenCanvas, type: string, ...rest: unknown[]) {
        if (type === "webgl2") return null;
        return (original as (...args: unknown[]) => unknown).call(this, type, ...rest);
      } as typeof original;
    });
    const errors = consoleErrors(page);
    const started = page.waitForEvent("worker", { predicate: (w) => WORKER_SCRIPT.test(w.url()), ...SETTLE });
    await page.goto("/en");
    await started;
    await live(page);
    await expect.poll(() => canvasInk(page), SETTLE).toBeGreaterThan(0.01);
    expect(await threeOnMainThread(page)).toBe(true);
    await expect.poll(() => page.workers().length).toBe(0); // the worker was stopped
    expect(errors).toEqual([]);
  });
});

test.describe("the monogram's face in the worker (Ruling R27)", () => {
  test.beforeEach(async ({ page }) => {
    await allowSoftwareGL(page);
    await page.goto("about:blank");
    test.skip(!(await canDrawScene(page)), NO_SCENE_REASON);
    test.skip(!(await canRenderInWorker(page)), NO_WORKER_GL_REASON);
  });

  type Posted = { type: string; glyphs?: { width: number; height: number } };

  /**
   * Messages the page posts to the scene worker, by type, with the size of any rasterised monogram the build carries
   * (a spy on Worker.postMessage, set before page scripts).
   */
  async function spyOnPosts(page: Page) {
    await page.addInitScript(() => {
      const post = Worker.prototype.postMessage;
      const log: Posted[] = [];
      (window as unknown as { __posts: Posted[] }).__posts = log;
      Worker.prototype.postMessage = function (this: Worker, message: unknown, ...rest: unknown[]) {
        const m = message as { type?: string; options?: { glyphs?: ImageData } };
        if (m && typeof m.type === "string") {
          const glyphs = m.options?.glyphs;
          log.push({ type: m.type, glyphs: glyphs ? { width: glyphs.width, height: glyphs.height } : undefined });
        }
        return (post as (...args: unknown[]) => void).call(this, message, ...rest);
      } as typeof post;
    });
    return () => page.evaluate(() => (window as unknown as { __posts: Posted[] }).__posts);
  }

  async function monogramDrawn(page: Page) {
    await scrollToP(page, 1); // the orb is the monogram here
    await expect.poll(() => canvasInk(page), SETTLE).toBeGreaterThan(0.005);
  }

  test("the worker loads the face itself where it has self.fonts", async ({ page }) => {
    const errors = consoleErrors(page);
    const posts = await spyOnPosts(page);
    const worker = page.waitForEvent("worker", { predicate: (w) => WORKER_SCRIPT.test(w.url()), ...SETTLE });
    await page.goto("/en");
    await live(page);
    const loaded = await (await worker).evaluate(() =>
      [...(self as unknown as { fonts: Iterable<FontFace> }).fonts].some((f) => f.family.replace(/"/g, "") === "Inter Tight" && f.status === "loaded"),
    );
    expect(loaded).toBe(true);
    const init = (await posts()).find((m) => m.type === "init");
    expect(init).toBeDefined();
    expect(init!.glyphs).toBeUndefined();
    await monogramDrawn(page);
    expect(errors).toEqual([]);
  });

  test("without self.fonts in the worker, the page rasterises the monogram and hands it over", async ({ page }) => {
    const errors = consoleErrors(page);
    const posts = await spyOnPosts(page);
    await workerPrelude(page, () => {
      // `fonts` is an accessor on the worker's global scope prototype (Chromium, Firefox).
      const scope = (self as unknown as { WorkerGlobalScope: { prototype: { fonts?: unknown } } }).WorkerGlobalScope;
      delete scope.prototype.fonts;
      delete (self as unknown as { fonts?: unknown }).fonts;
    });
    await page.goto("/en");
    await live(page);
    const init = (await posts()).find((m) => m.type === "init");
    expect(init?.glyphs).toEqual({ width: 640, height: 300 });
    await monogramDrawn(page);
    expect(errors).toEqual([]);
  });
});

/**
 * Makes every animation frame callback of the thread it runs in take `ms` longer: 30 ms is like a GPU too slow for
 * full quality (an HD 4600 runs the hero at about 30 fps at tier 0 on the main thread), 60 ms like one too slow even
 * for tier 1. Software WebGL is not reliably slow: Firefox draws this scene at 60 fps from a worker here.
 */
function slowFrames(ms: number) {
  const raf = self.requestAnimationFrame.bind(self);
  self.requestAnimationFrame = (cb: FrameRequestCallback) =>
    raf((t) => {
      const end = performance.now() + ms;
      while (performance.now() < end) {
        // busy: the frame's work
      }
      cb(t);
    });
}

/** Slows the frames of the thread that draws the scene in `mode`. */
async function slowSceneFrames(page: Page, mode: Mode, ms: number) {
  if (mode === "worker") {
    test.skip(!(await canRenderInWorker(page)), NO_WORKER_GL_REASON);
    await workerPrelude(page, slowFrames, ms);
  } else {
    await mainThreadOnly(page);
    await page.addInitScript(slowFrames, ms);
  }
}

/** Every value `#scene[data-tier]` takes, in order, from before the page's scripts run. */
async function recordTiers(page: Page) {
  await page.addInitScript(() => {
    const seen: string[] = [];
    (window as unknown as { __tiers: string[] }).__tiers = seen;
    new MutationObserver(() => {
      const tier = document.getElementById("scene")?.dataset.tier;
      if (tier !== undefined && seen.at(-1) !== tier) seen.push(tier);
    }).observe(document, { subtree: true, attributes: true, attributeFilter: ["data-tier"] });
  });
  return () => page.evaluate(() => (window as unknown as { __tiers: string[] }).__tiers);
}

test.describe("adaptive quality", () => {
  test.beforeEach(async ({ page }) => {
    await allowSoftwareGL(page);
    await page.goto("about:blank");
    test.skip(!(await canDrawScene(page)), NO_SCENE_REASON);
  });

  for (const mode of MODES) {
    test(`slow frames step the scene down to tier 1, once, and it stays live (${mode})`, async ({ page }) => {
      await slowSceneFrames(page, mode, 30);
      const tiers = await recordTiers(page);
      const errors = consoleErrors(page);
      await page.goto("/en");
      await live(page);
      // Out of the hero at once, so start-up ends there and tier 1 is the floor (Ruling R29).
      await scrollToP(page, 1);
      await expect(page.locator("#scene")).toHaveAttribute("data-tier", "1", SETTLE);
      // Drawn at three quarters of the resolution, and never taken further down by frame times.
      await expect
        .poll(() =>
          page.locator("#scene").evaluate((c: HTMLCanvasElement) => {
            const pr = Math.min(devicePixelRatio || 1, 2) * 0.75;
            return Math.abs(c.width - c.clientWidth * pr) <= 1;
          }),
        )
        .toBe(true);
      await page.waitForTimeout(6000);
      await expect(page.locator("#scene")).toHaveAttribute("data-tier", "1");
      await expect(page.locator("#scene")).toHaveAttribute("data-scene", "live");
      expect(await tiers()).toEqual(["0", "1"]);
      await expect.poll(() => canvasInk(page), SETTLE).toBeGreaterThan(0.01);
      expect(errors).toEqual([]);
    });

    test(`too slow even at tier 1 in the hero at start-up: the poster and the list, for good (Ruling R29, ${mode})`, async ({
      page,
    }) => {
      // The governor is told the frame times (and its clock runs on), so the outcome does not depend on how busy the
      // machine is; the rules themselves are the product's. The slow-frame tests above run the real thing.
      await page.addInitScript(() => {
        window.__orbitFrames = { frameMs: 60 };
      });
      if (mode === "worker") test.skip(!(await canRenderInWorker(page)), NO_WORKER_GL_REASON);
      else await mainThreadOnly(page);
      const tiers = await recordTiers(page);
      const errors = consoleErrors(page);
      await page.goto("/en");
      await live(page);
      await expect(page.locator("#scene")).toHaveAttribute("data-tier", "2", { timeout: 90_000 });
      expect(await tiers()).toEqual(["0", "1", "2"]); // one tier at a time
      await expect(page.locator("#scene")).toHaveAttribute("data-scene", "off");
      await expect(page.locator("#orb-poster")).toHaveCSS("visibility", "visible");
      await expect.poll(() => canvasInk(page), SETTLE).toBeLessThan(0.0005); // the scene is gone, not frozen
      await expect.poll(() => page.workers().length, SETTLE).toBe(0); // and its worker closed
      await scrollToP(page, scrollForProject(0));
      await expect(page.locator("#list")).toHaveClass(/\bon\b/, SETTLE);
      await expect(page.locator("#scene")).toHaveAttribute("data-scene", "off");
      expect(errors).toEqual([]);
    });
  }

  test("from a worker, slow page frames step it down too: the DOM layers share the GPU with the scene", async ({
    page,
  }) => {
    // Firefox draws this scene from a worker at 60 fps here, so only the page's frames are slow and the test tells
    // the two apart; Chromium's software WebGL makes the worker slow as well.
    test.skip(!(await canRenderInWorker(page)), NO_WORKER_GL_REASON);
    await page.addInitScript(slowFrames, 30);
    const errors = consoleErrors(page);
    const worker = page.waitForEvent("worker", { predicate: (w) => WORKER_SCRIPT.test(w.url()), ...SETTLE });
    await page.goto("/en");
    await worker;
    await live(page);
    await scrollToP(page, 1); // out of the hero: tier 1 is the floor
    await expect(page.locator("#scene")).toHaveAttribute("data-tier", "1", SETTLE);
    await expect(page.locator("#scene")).toHaveAttribute("data-scene", "live");
    expect(errors).toEqual([]);
  });
});
