import { test, type Page, type Worker } from "@playwright/test";
import { scrollForProject, ss } from "../../app/lib/timeline";
import { COUNT, idx, projects } from "./projects";
import { RENDER_SCALE } from "../../app/scene/quality";
import {
  bufferMatchesBox,
  tierOf,
  canDrawScene,
  canTransfer,
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

/**
 * Headless Chromium has only software WebGL (SwiftShader), which the page refuses in production
 * (failIfMajorPerformanceCaveat). These tests opt back in through the page's test-only switch,
 * `window.__orbitSceneTest = "allow-software-gl"`, set by `allowSoftwareGL` with addInitScript before the page
 * loads. Production never sets it; the last test checks the page without it.
 *
 * The scene renders from a worker where the browser can transfer a canvas (Chromium, Firefox), so the tests run
 * there unless they say otherwise; the fallback tests run in both modes. Software WebGL makes frames slow, a
 * second each on a busy machine, so this file waits longer for the smoothed scroll to settle.
 */
test.describe.configure({ timeout: 120_000 });

/** The galaxy with the first card in focus (P = 4.9). */
const GALAXY_P = scrollForProject(0);

type Circle = { x: number; y: number; r: number };

/**
 * Where the page centres the black hole: the glow's centre (the orb's core), the horizon's, and the round
 * window onto space while it is a disc (null when closed or open to the whole viewport).
 */
function holeGeometry() {
  const px = (v: string) => parseFloat(v);
  const glow = document.getElementById("glow")!;
  const horizon = document.getElementById("horizon")!;
  const hole = document.getElementById("hole")!;
  const r = px(hole.style.width) / 2;
  const isDisc = r > 0 && hole.style.borderRadius !== "0";
  return {
    x: px(glow.style.left),
    y: px(glow.style.top),
    background: glow.style.background,
    horizon: { x: px(horizon.style.left), y: px(horizon.style.top) },
    disc: (isDisc ? { x: px(hole.style.left) + r, y: px(hole.style.top) + r, r } : null) as Circle | null,
  };
}

/** The glow keeps the stylesheet's apricot while the poster stands in (the poster's glow is baked apricot). */
async function expectUntintedGlow(page: Page) {
  const glow = await page.locator("#glow").evaluate((el) => ({
    inline: el.style.background,
    computed: getComputedStyle(el).backgroundImage,
  }));
  expect(glow.inline).toBe("");
  expect(glow.computed).toContain("rgba(255, 138, 74");
}

/** The scene worker, once the page has started it. */
const sceneWorker = (page: Page): Promise<Worker> =>
  page.waitForEvent("worker", { predicate: (w) => WORKER_SCRIPT.test(w.url()), ...SETTLE });

test.describe("with software WebGL allowed", () => {
  test.beforeEach(({ page }) => allowSoftwareGL(page));

  test("loads without console errors: the scene goes live where the browser can draw it, the poster stays elsewhere", async ({
    page,
  }) => {
    const errors = consoleErrors(page);
    await page.goto("/en");
    const capable = await canDrawScene(page);
    await sceneState(page, capable ? "live" : "off");
    await expect(page.locator("#orb-poster")).toHaveCSS("visibility", capable ? "hidden" : "visible");
    await scrollToP(page, GALAXY_P);
    await expect(page.locator("#hud")).toHaveCSS("visibility", "visible", SETTLE);
    await expect(page.locator("#title")).toHaveText(projects[0].title);
    expect(errors).toEqual([]);
  });

  test.describe("3D scene", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("about:blank");
      test.skip(!(await canDrawScene(page)), NO_SCENE_REASON);
    });

    test("draws the orb at the top and the galaxy at P = 4.9, with no console errors", async ({ page }) => {
      const errors = consoleErrors(page);
      await page.goto("/en");
      await live(page);
      await expect.poll(() => canvasInk(page), SETTLE).toBeGreaterThan(0.01);
      // The measure sees only the canvas: with it hidden too, nothing is lit.
      expect(await canvasInk(page, { withCanvas: false })).toBeLessThan(0.0005);

      await scrollToP(page, GALAXY_P);
      await expect(page.locator("#hud")).toHaveCSS("visibility", "visible", SETTLE);
      await expect(page.locator("#title")).toHaveText(projects[0].title);
      await expect.poll(() => canvasInk(page), SETTLE).toBeGreaterThan(0.002);
      expect(errors).toEqual([]);
    });

    test("no cover or card texture is requested before the scene is live; the scene then loads its textures", async ({
      page,
    }) => {
      await page.addInitScript(() => {
        // When #scene turns live, on the wall clock, to compare with resource timing from the page or the worker.
        new MutationObserver((_, observer) => {
          if (document.getElementById("scene")?.dataset.scene !== "live") return;
          (window as unknown as { __liveAt: number }).__liveAt = performance.timeOrigin + performance.now();
          observer.disconnect();
        }).observe(document, { subtree: true, attributes: true, attributeFilter: ["data-scene"] });
      });
      // The textures are fetched by whichever thread renders: the page's resource timing, or the worker's.
      const pick = () =>
        performance
          .getEntriesByType("resource")
          .filter((r) => /\/projects\/[\w-]+\/(card|cover)\.\w+$/.test(r.name))
          .map((r) => ({ url: r.name, start: performance.timeOrigin + r.startTime }));
      const images = async () =>
        (await Promise.all([page.evaluate(pick), ...page.workers().map((w) => w.evaluate(pick))])).flat();
      await page.goto("/en");
      await live(page);
      await expect.poll(async () => (await images()).length, SETTLE).toBeGreaterThanOrEqual(COUNT);
      const liveAt = await page.evaluate(() => (window as unknown as { __liveAt: number }).__liveAt);
      for (const image of await images()) {
        expect(image.url, "the scene loads card textures, not the full-size covers").toMatch(/\/card\.(avif|webp)$/);
        expect(image.start, image.url).toBeGreaterThan(liveAt);
      }
    });

    test("the glow and the black hole centre on the orb the scene draws (Ruling R5)", async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto("/en");
      await live(page);
      const centres = () => page.evaluate(holeGeometry);

      // At the top the orb's core projects to the horizontal centre, a little above the middle,
      // and the halo takes the sphere's apricot.
      await expect.poll(async () => (await centres()).background).toContain("rgba(255, 143, 77");
      const top = await centres();
      expect(Math.abs(top.x - 720)).toBeLessThan(3);
      expect(top.y / 900).toBeGreaterThan(0.38);
      expect(top.y / 900).toBeLessThan(0.44);

      // While it opens, the round window onto space is centred on the core.
      await scrollToP(page, 2.9);
      await expect.poll(async () => (await centres()).disc?.r ?? 0, SETTLE).toBeGreaterThan(500);
      const opening = await centres();
      expect(Math.abs(opening.disc!.x - opening.x)).toBeLessThan(1);
      expect(Math.abs(opening.disc!.y - opening.y)).toBeLessThan(1);

      // Mid-flight the camera swings towards the galaxy, so the core leaves the poster's fixed centre;
      // the black hole's horizon follows the core.
      await scrollToP(page, 3.1);
      await expect.poll(async () => 720 - (await centres()).x, SETTLE).toBeGreaterThan(25);
      const mid = await centres();
      expect(Math.abs(mid.horizon.x - mid.x)).toBeLessThan(1);
      expect(Math.abs(mid.horizon.y - mid.y)).toBeLessThan(1);
    });

    for (const mode of MODES) {
      test(`${mode === "worker" ? "from a worker" : "on the main thread"}: a scene that starts at P = 2.9 has the black hole's window on its core all through its fade-in`, async ({
        page,
      }) => {
        if (mode === "main thread") await mainThreadOnly(page);
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.addInitScript(() => {
          type Disc = { x: number; y: number; core: { x: number; y: number } };
          const w = window as unknown as { __rampDiscs: Disc[]; __rampSampling?: boolean };
          w.__rampDiscs = [];
          // Each page frame while the scene fades in, read after the page has placed its layers for that frame: the
          // sampler is first registered from the task that turned #scene to "ramp", after the page's own loop.
          const sample = () => {
            if (document.getElementById("scene")?.dataset.scene !== "ramp") return;
            const hole = document.getElementById("hole")!;
            const r = parseFloat(hole.style.width) / 2;
            if (r > 0 && hole.style.borderRadius !== "0") {
              // The glow is centred on the point the page uses that frame: the scene's core, once it has reported it.
              const glow = document.getElementById("glow")!;
              w.__rampDiscs.push({
                x: parseFloat(hole.style.left) + r,
                y: parseFloat(hole.style.top) + r,
                core: { x: parseFloat(glow.style.left), y: parseFloat(glow.style.top) },
              });
            }
            requestAnimationFrame(sample);
          };
          new MutationObserver(() => {
            if (w.__rampSampling || document.getElementById("scene")?.dataset.scene !== "ramp") return;
            w.__rampSampling = true;
            requestAnimationFrame(sample);
          }).observe(document, { subtree: true, attributes: true, attributeFilter: ["data-scene"] });
        });
        // The scene's first download waits until the page has settled at P = 2.9, past the hero, so the scene fades in
        // there, on the core it ends on. (Started while the scroll still eased in, its core would move with it.)
        let release!: () => void;
        const settled = new Promise<void>((resolve) => (release = resolve));
        await page.route(mode === "worker" ? WORKER_SCRIPT : SCENE_CHUNK, async (route) => {
          await settled;
          await route.continue();
        });
        // The pointer at the centre: no parallax (Firefox moves the scene's pointer with a synthetic mouse event after
        // a scroll, from wherever the mouse is), so the core stays put through the fade-in.
        await page.mouse.move(720, 450);
        await page.goto("/en");
        await scrollToP(page, 2.9);
        // Settled: the window's size (it grows with P) the same over five page frames in a row; the smoothed P only
        // stops changing once it snaps to the target. (Frames, not time: software WebGL can make them slow.)
        await page.evaluate(
          () =>
            new Promise<void>((resolve) => {
              let last = "";
              let same = 0;
              const tick = () => {
                const width = document.getElementById("hole")!.style.width;
                same = width === last && width !== "" && width !== "0px" ? same + 1 : 0;
                last = width;
                if (same >= 5) resolve();
                else requestAnimationFrame(tick);
              };
              requestAnimationFrame(tick);
            }),
        );
        release();
        await live(page);
        const core = await page.evaluate(holeGeometry);
        type Disc = { x: number; y: number; core: { x: number; y: number } };
        const discs = await page.evaluate(() => (window as unknown as { __rampDiscs: Disc[] }).__rampDiscs);
        // At least one page frame inside the fade-in (it lasts 600 ms or more; software WebGL can starve the page's frames).
        expect(discs.length, "frames sampled during the fade-in").toBeGreaterThan(0);
        for (const d of discs) {
          // On the core the page uses in that frame, and that is the scene's core, where it ends up.
          expect(Math.hypot(d.x - d.core.x, d.y - d.core.y), JSON.stringify(d)).toBeLessThanOrEqual(1);
          expect(Math.hypot(d.x - core.x, d.y - core.y), JSON.stringify(d)).toBeLessThanOrEqual(1);
        }
        // Setup check: the poster's centre is elsewhere, so a window left on it would fail the check above.
        const poster = await page.locator("#orb-poster").evaluate((el) => {
          const r = el.getBoundingClientRect();
          return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        });
        expect(Math.hypot(poster.x - core.x, poster.y - core.y)).toBeGreaterThan(2);
      });
    }

    test("while the black hole opens, the scene draws only inside it", async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto("/en");
      await live(page);
      await scrollToP(page, 2.7);
      // Settled when the window's radius is the one P = 2.7 gives (rpx + half the 1.5 px edge).
      const rpx = ss(2.5, 3.15, 2.7) ** 2.1 * Math.hypot(1440, 900) * 1.05;
      await expect.poll(async () => (await page.evaluate(holeGeometry)).disc?.r ?? 0, SETTLE).toBeCloseTo(rpx + 0.75, 1);
      const { disc } = await page.evaluate(holeGeometry);
      // The core shines inside the hole; stars and glow outside it are clipped away (2 px past the soft edge).
      // From a worker, the frame drawn with this clip may land a moment after the page's, so both settle.
      await expect.poll(() => canvasInk(page, { inside: disc! }), SETTLE).toBeGreaterThan(0.002);
      await expect.poll(() => canvasInk(page, { outside: { ...disc!, r: disc!.r + 2 } }), SETTLE).toBeLessThan(0.00005);
    });

    test("the drawing size and the orb's centre follow the canvas's client box, not the window (Ruling R20)", async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto("/en");
      await live(page);
      const measure = async () => ({
        bufferMatches: await bufferMatchesBox(page),
        ...(await page.evaluate(() => {
          const canvas = document.getElementById("scene") as HTMLCanvasElement;
          const poster = document.getElementById("orb-poster")!.getBoundingClientRect();
          return {
            client: canvas.clientWidth,
            coreX: parseFloat(document.getElementById("glow")!.style.left),
            posterX: poster.left + poster.width / 2,
          };
        })),
      });
      // The poster and the live orb share one centre, so the handover does not jump sideways.
      await expect
        .poll(async () => {
          const full = await measure();
          return full.bufferMatches && Math.abs(full.coreX - full.posterX) <= 1;
        }, SETTLE)
        .toBe(true);

      // A narrower content box (as a classic scrollbar makes it): the buffer and the core follow the box.
      await page.addStyleTag({ content: "#scene { width: 70% !important; }" });
      await expect
        .poll(async () => {
          const m = await measure();
          return m.client < 1100 && m.bufferMatches && Math.abs(m.coreX - m.client / 2) <= 1;
        }, SETTLE)
        .toBe(true);
    });

    test("a change of device pixel ratio alone (browser zoom, a window moved to another screen) re-sizes the canvas, and again after that", async ({
      page,
      browserName,
    }) => {
      test.skip(browserName !== "chromium", "one browser is enough for the wiring");
      // Headless Chromium does not fire the resolution query when its emulated ratio changes, so the test plays the
      // browser's part: it sets the ratio and fires "change" on the resolution queries the page has made.
      await page.addInitScript(() => {
        const queries: MediaQueryList[] = [];
        const original = window.matchMedia.bind(window);
        window.matchMedia = (q: string) => {
          const mql = original(q);
          if (q.includes("resolution")) queries.push(mql);
          return mql;
        };
        (window as unknown as { __setRatio: (r: number) => void }).__setRatio = (ratio) => {
          Object.defineProperty(window, "devicePixelRatio", { configurable: true, value: ratio });
          for (const mql of queries.splice(0)) mql.dispatchEvent(new Event("change"));
        };
      });
      await page.setViewportSize({ width: 1000, height: 700 });
      await page.goto("/en");
      await live(page);
      const bufferWidth = () => page.locator("#scene").evaluate((c: HTMLCanvasElement) => c.width);
      const setRatio = (r: number) => page.evaluate((x) => (window as unknown as { __setRatio: (r: number) => void }).__setRatio(x), r);
      const tierScale = async () => RENDER_SCALE[await tierOf(page)];
      // Same CSS size, so no ResizeObserver callback: only the ratio query can resize the canvas.
      await setRatio(2);
      await expect.poll(async () => (await bufferWidth()) === Math.round(1000 * 2 * (await tierScale())), SETTLE).toBe(true);
      // The query was re-armed for the new ratio, so the next change is seen too.
      await setRatio(1);
      await expect.poll(async () => (await bufferWidth()) === Math.round(1000 * (await tierScale())), SETTLE).toBe(true);
    });

    test("resizing 1440×900 to 900×1440 at P = 4.9 keeps the focused title and a sharp canvas", async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto("/en");
      await live(page);
      await scrollToP(page, GALAXY_P);
      const title = page.locator("#title");
      await expect(page.locator("#hud")).toHaveCSS("visibility", "visible", SETTLE);
      await expect(title).toHaveText(projects[0].title);

      await page.setViewportSize({ width: 900, height: 1440 });
      // The drawing buffer follows the new size at the device pixel ratio (and the tier's render scale), so
      // nothing is stretched.
      await expect
        .poll(
          async () =>
            (await bufferMatchesBox(page)) &&
            // The canvas fills the layout viewport. That is 900 px on desktop; a phone project's emulated device lays
            // the page out a few pixels wider (906 on the Pixel 7), so compare with the page's own width.
            (await page.locator("#scene").evaluate((c) => c.clientWidth === innerWidth && innerWidth >= 900 && innerWidth < 1000)),
          SETTLE,
        )
        .toBe(true);
      // The same P, not merely the same pixel offset: at the old offset P would be about 3.1 and the HUD gone.
      await expect
        .poll(
          () => page.evaluate(() => scrollY / document.getElementById("unit-probe")!.getBoundingClientRect().height),
          SETTLE,
        )
        .toBeCloseTo(GALAXY_P, 1);
      await expect(page.locator("#hud")).toHaveCSS("visibility", "visible", SETTLE);
      await expect(title).toHaveText(projects[0].title);
      await expect.poll(() => canvasInk(page), SETTLE).toBeGreaterThan(0.002);
    });
  });

  test.describe("fallbacks", () => {
    test.skip(({ browserName }) => browserName !== "chromium", "fallback paths are exercised in Chromium");

    test("a card texture that 404s: the scene stays live and the page works", async ({ page }) => {
      const COVER = /\/projects\/equip4safety\/card\.(avif|webp)$/;
      const errors = consoleErrors(page, COVER);
      const tried: string[] = [];
      await page.route(COVER, (route) => {
        tried.push(route.request().url().split(".").pop()!);
        return route.fulfill({ status: 404, body: "" });
      });
      await page.goto("/en");
      await live(page);
      await expect.poll(() => tried.sort().join(","), SETTLE).toBe("avif,webp"); // AVIF, then the WebP sibling
      await scrollToP(page, scrollForProject(4));
      await expect(page.locator("#idx")).toHaveText(idx(5), SETTLE);
      await expect(page.locator("#title")).toHaveText(projects[4].title);
      await expect(page.locator("#scene")).toHaveAttribute("data-scene", "live");
      await expect.poll(() => canvasInk(page), SETTLE).toBeGreaterThan(0.002);
      expect(errors).toEqual([]);
    });

    for (const mode of MODES) {
      test.describe(`rendering ${mode === "worker" ? "from a worker" : "on the main thread"}`, () => {
        test.beforeEach(async ({ page }) => {
          if (mode === "main thread") await mainThreadOnly(page);
          else {
            await page.goto("about:blank");
            test.skip(!(await canTransfer(page)), "this browser cannot transfer a canvas to a worker");
          }
        });

        test("the 3D chunk fails to load: the poster stays", async ({ page }) => {
          const errors = consoleErrors(page, SCENE_CHUNK);
          let aborted = 0;
          await page.route(SCENE_CHUNK, (route) => {
            aborted++;
            return route.abort();
          });
          await page.goto("/en");
          await sceneState(page, "off");
          expect(aborted).toBe(1); // the chunk really was requested, so a renamed chunk fails loudly
          await expect(page.locator("#orb-poster")).toHaveCSS("visibility", "visible");
          await expectUntintedGlow(page);
          expect(errors).toEqual([]);
        });

        test("no WebGL context: the poster stays, three.js is never downloaded, the glow stays apricot", async ({
          page,
        }) => {
          const errors = consoleErrors(page);
          await noWebGL(page, mode);
          const chunkRequests: string[] = [];
          page.on("request", (r) => {
            if (SCENE_CHUNK.test(r.url())) chunkRequests.push(r.url());
          });
          await page.goto("/en");
          await sceneState(page, "off");
          await expect(page.locator("#scene")).toHaveAttribute("data-tier", "2", SETTLE);
          await expect(page.locator("#orb-poster")).toHaveCSS("visibility", "visible");
          // At the monogram stage the glow would turn blue if it were tinted; with the poster it must not.
          await scrollToP(page, 1);
          await expect
            .poll(() => page.locator("#glow").evaluate((el) => parseFloat(el.style.opacity)), SETTLE)
            .toBeLessThan(0.75);
          await expectUntintedGlow(page);
          expect(chunkRequests).toEqual([]);
          expect(errors).toEqual([]);
        });

        test("a lost GPU context shows the poster, and the scene returns when the context is restored (Ruling R19)", async ({
          page,
        }) => {
          const errors = consoleErrors(page);
          const context = await contextSwitch(page, mode);
          await page.goto("/en");
          await live(page);
          await context.lose();
          await sceneState(page, "off");
          await expect(page.locator("#orb-poster")).toHaveCSS("visibility", "visible");
          await expectUntintedGlow(page);

          await context.restore();
          await live(page);
          await expect(page.locator("#orb-poster")).toHaveCSS("visibility", "hidden");
          await expect.poll(() => canvasInk(page), SETTLE).toBeGreaterThan(0.01);
          expect(errors).toEqual([]);
        });

        test("a context lost while the scene is still being built: the poster stays, and the restore builds it (Ruling R22)", async ({
          page,
        }) => {
          const errors = consoleErrors(page);
          const context = await loseDuringBuild(page, mode);
          // The build gives up on the lost context: the page warns and keeps the poster.
          const buildEnded = page.waitForEvent("console", {
            predicate: (m) => m.text().includes("3D scene is unavailable"),
            ...SETTLE,
          });
          await page.goto("/en");
          await sceneState(page, "off");
          await buildEnded;
          // A scene that came up on the dead context would mark itself live on its next frame; give it a few.
          await page.evaluate(
            () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(done, 300)))),
          );
          await expect(page.locator("#scene")).toHaveAttribute("data-scene", "off");
          await expect(page.locator("#orb-poster")).toHaveCSS("visibility", "visible");

          await context.restore();
          await live(page);
          await expect(page.locator("#orb-poster")).toHaveCSS("visibility", "hidden");
          await expect.poll(() => canvasInk(page), SETTLE).toBeGreaterThan(0.01);
          expect(errors).toEqual([]);
        });
      });
    }
  });
});

/**
 * Every WebGL context request fails: on the page, and in worker mode in the worker too (a worker without WebGL hands
 * the page back its canvas, so the page must lack WebGL as well for the poster to stay).
 */
async function noWebGL(page: Page, mode: Mode) {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
      if (type === "webgl" || type === "webgl2") return null;
      return (original as (...args: unknown[]) => unknown).call(this, type, ...rest);
    } as typeof original;
  });
  if (mode === "main thread") return;
  await workerPrelude(page, () => {
    const original = OffscreenCanvas.prototype.getContext;
    OffscreenCanvas.prototype.getContext = function (this: OffscreenCanvas, type: string, ...rest: unknown[]) {
      if (type === "webgl" || type === "webgl2") return null;
      return (original as (...args: unknown[]) => unknown).call(this, type, ...rest);
    } as typeof original;
  });
}

type ContextSwitch = { lose(): Promise<void>; restore(): Promise<void> };
type LoseHolder = { __lose: WEBGL_lose_context };

/**
 * Loses and restores the scene's context on demand (WEBGL_lose_context), in the thread that renders. In worker mode
 * a prelude keeps the extension of the scene canvas's WebGL 2 context on `self` (the worker's 1×1 capability check is
 * a canvas of its own, released at once).
 */
async function contextSwitch(page: Page, mode: Mode): Promise<ContextSwitch> {
  if (mode === "main thread") {
    return {
      lose: () =>
        page.evaluate(() => {
          const gl = (document.getElementById("scene") as HTMLCanvasElement).getContext("webgl2")!;
          const ext = gl.getExtension("WEBGL_lose_context")!;
          (window as unknown as LoseHolder).__lose = ext;
          ext.loseContext();
        }),
      restore: () => page.evaluate(() => (window as unknown as LoseHolder).__lose.restoreContext()),
    };
  }
  await workerPrelude(page, () => {
    const getContext = OffscreenCanvas.prototype.getContext;
    OffscreenCanvas.prototype.getContext = function (this: OffscreenCanvas, type: string, ...rest: unknown[]) {
      const ctx = (getContext as (...args: unknown[]) => unknown).call(this, type, ...rest);
      const holder = self as unknown as { __lose?: WEBGL_lose_context };
      const capabilityCheck = this.width === 1 && this.height === 1;
      if (type === "webgl2" && ctx && !capabilityCheck && !holder.__lose) {
        holder.__lose = (ctx as WebGL2RenderingContext).getExtension("WEBGL_lose_context") ?? undefined;
      }
      return ctx;
    } as typeof getContext;
  });
  const worker = sceneWorker(page);
  return {
    lose: async () => (await worker).evaluate(() => (self as unknown as LoseHolder).__lose.loseContext()),
    restore: async () => (await worker).evaluate(() => (self as unknown as LoseHolder).__lose.restoreContext()),
  };
}

/**
 * Loses the scene's context on the first task after the scene asks for it, while createScene is between stages,
 * and hides KHR_parallel_shader_compile: without it (some browsers lack it) three.js's compileAsync settles even on
 * a lost context, so the build could finish on a dead context, the race Ruling R22 is about.
 */
async function loseDuringBuild(page: Page, mode: Mode): Promise<Pick<ContextSwitch, "restore">> {
  if (mode === "main thread") {
    await page.addInitScript(() => {
      const getExtension = WebGL2RenderingContext.prototype.getExtension as (this: unknown, name: string) => unknown;
      WebGL2RenderingContext.prototype.getExtension = function (this: WebGL2RenderingContext, name: string) {
        return name === "KHR_parallel_shader_compile" ? null : getExtension.call(this, name);
      } as typeof WebGL2RenderingContext.prototype.getExtension;
      // On the main thread the availability check uses a throwaway canvas, so #scene's first context is the scene's.
      const getContext = HTMLCanvasElement.prototype.getContext;
      let armed = true;
      HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
        const ctx = (getContext as (...args: unknown[]) => unknown).call(this, type, ...rest);
        if (armed && this.id === "scene" && type === "webgl2" && ctx) {
          armed = false;
          const ext = (ctx as WebGL2RenderingContext).getExtension("WEBGL_lose_context")!;
          (window as unknown as LoseHolder).__lose = ext;
          setTimeout(() => ext.loseContext(), 0);
        }
        return ctx;
      } as typeof getContext;
    });
    return { restore: () => page.evaluate(() => (window as unknown as LoseHolder).__lose.restoreContext()) };
  }
  await workerPrelude(page, () => {
    const getExtension = WebGL2RenderingContext.prototype.getExtension as (this: unknown, name: string) => unknown;
    WebGL2RenderingContext.prototype.getExtension = function (this: WebGL2RenderingContext, name: string) {
      return name === "KHR_parallel_shader_compile" ? null : getExtension.call(this, name);
    } as typeof WebGL2RenderingContext.prototype.getExtension;
    // The worker asks for the scene canvas's context twice: its hardware check, then createScene. Arm on the second.
    // (Its 1×1 capability check, before the canvas is transferred, is a canvas of its own.)
    const getContext = OffscreenCanvas.prototype.getContext;
    const calls = new WeakMap<OffscreenCanvas, number>();
    OffscreenCanvas.prototype.getContext = function (this: OffscreenCanvas, type: string, ...rest: unknown[]) {
      const ctx = (getContext as (...args: unknown[]) => unknown).call(this, type, ...rest);
      const n = (calls.get(this) ?? 0) + 1;
      calls.set(this, n);
      if (type === "webgl2" && ctx && n === 2 && !(this.width === 1 && this.height === 1)) {
        const ext = (ctx as WebGL2RenderingContext).getExtension("WEBGL_lose_context")!;
        (self as unknown as LoseHolder).__lose = ext;
        setTimeout(() => ext.loseContext(), 0);
      }
      return ctx;
    } as typeof getContext;
  });
  const worker = sceneWorker(page);
  return { restore: async () => (await worker).evaluate(() => (self as unknown as LoseHolder).__lose.restoreContext()) };
}

test("without the test switch, software WebGL gets no scene and no 3D download (Ruling R18)", async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== "chromium", "headless Chromium is the browser here whose only WebGL is software");
  const errors = consoleErrors(page);
  const chunkRequests: string[] = [];
  page.on("request", (r) => {
    if (SCENE_CHUNK.test(r.url())) chunkRequests.push(r.url());
  });
  await page.goto("/en");
  await sceneState(page, "off");
  await expect(page.locator("#scene")).toHaveAttribute("data-tier", "2", SETTLE);
  await expect(page.locator("#orb-poster")).toHaveCSS("visibility", "visible");
  // The worker found only software WebGL on the canvas and was closed.
  await expect.poll(() => page.workers().length).toBe(0);
  expect(chunkRequests).toEqual([]);
  expect(errors).toEqual([]);
});
