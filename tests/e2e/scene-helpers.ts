/**
 * Shared by the 3D scene's e2e specs (scene.spec.ts, fallbacks.spec.ts): scrolling to a scroll position, console
 * errors, the canvas's ink from a screenshot (Ruling R6), and the switches that pick the scene's thread.
 */
import { expect as baseExpect, type Page } from "@playwright/test";
import sharp from "sharp";
import { RENDER_SCALE } from "../../app/scene/quality";
import type { Tier } from "../../app/scene/types";

/** Software WebGL makes frames slow, a second each on a busy machine: scene tests wait longer. */
export const expect = baseExpect.configure({ timeout: 15_000 });
export const SETTLE = { timeout: 45_000 };

/** The lazily loaded three.js scene chunk, whichever thread loads it (the worker's build names it the same way). */
export const SCENE_CHUNK = /\/assets\/scene-[\w-]+\.js$/;
/** The scene worker's own script: small, no three.js; it loads SCENE_CHUNK only once it has a capable context. */
export const WORKER_SCRIPT = /\/assets\/scene\.worker-[\w-]+\.js$/;

export const unitOf = (page: Page) =>
  page.evaluate(() => document.getElementById("unit-probe")!.getBoundingClientRect().height);

export async function scrollToP(page: Page, P: number) {
  const unit = await unitOf(page);
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), P * unit);
}

/**
 * Console errors and uncaught exceptions. A request a test fails on purpose is reported by the browser itself
 * ("Failed to load resource"); pass its URL pattern to allow exactly that and nothing else.
 */
export function consoleErrors(page: Page, failedOnPurpose?: RegExp): string[] {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const url = m.location().url;
    if (failedOnPurpose && m.text().startsWith("Failed to load resource") && failedOnPurpose.test(url)) return;
    errors.push(`${m.text()} (${url})`);
  });
  page.on("pageerror", (e) => errors.push(`uncaught: ${e.message}`));
  return errors;
}

/** What the scene needs from the browser: WebGL 2 (software allowed here) and a 2D OffscreenCanvas. */
export const canDrawScene = (page: Page) =>
  page.evaluate(
    () =>
      typeof OffscreenCanvas !== "undefined" &&
      !!new OffscreenCanvas(1, 1).getContext("2d") &&
      !!document.createElement("canvas").getContext("webgl2"),
  );

/** Whether this browser hands a canvas to a worker (the gate for worker rendering). */
export const canTransfer = (page: Page) =>
  page.evaluate(() => typeof HTMLCanvasElement.prototype.transferControlToOffscreen === "function");

export const NO_SCENE_REASON =
  "this browser build cannot draw the scene (Playwright's Windows WebKit has no OffscreenCanvas; " +
  "Safari has had it since 16.4), so the page keeps the poster; the fallback tests cover it";

export type Mode = "worker" | "main thread";
export const MODES: Mode[] = ["worker", "main thread"];

/**
 * Takes away the worker path's feature gate (Ruling R27), so the page renders on the main thread. OffscreenCanvas
 * itself stays: the scene draws its monogram and core sprite on a 2D OffscreenCanvas in either mode.
 */
export async function mainThreadOnly(page: Page): Promise<void> {
  await page.addInitScript(() => {
    delete (HTMLCanvasElement.prototype as Partial<HTMLCanvasElement>).transferControlToOffscreen;
  });
}

/**
 * Runs `prelude` inside the scene worker before its own code: the worker's script is fetched through the page's
 * routes (in every engine), so the test prepends the function to it, called with `arg` (JSON). Import declarations
 * are hoisted, so the prelude still runs before the worker's message handler exists.
 */
export async function workerPrelude<A>(page: Page, prelude: (arg: A) => void, arg?: A): Promise<void> {
  await page.route(WORKER_SCRIPT, async (route) => {
    const response = await route.fetch();
    const body = `(${prelude.toString()})(${JSON.stringify(arg ?? null)});\n${await response.text()}`;
    await route.fulfill({ response, body });
  });
}

type Circle = { x: number; y: number; r: number };

/**
 * Share of the viewport the canvas paints. Every other layer is hidden over a black page, so the clear
 * colour reads as black, and the screenshot is compared against it (Ruling R6: never readPixels, so the
 * same check works when the scene renders from a worker). `inside` or `outside` a circle (in CSS px) counts
 * only the pixels there, still as a share of the whole viewport.
 */
export async function canvasInk(
  page: Page,
  { withCanvas = true, inside, outside }: { withCanvas?: boolean; inside?: Circle; outside?: Circle } = {},
): Promise<number> {
  const css =
    "html, body { background: #000 !important; } body * { visibility: hidden !important; }" +
    (withCanvas ? " #scene { visibility: visible !important; }" : "");
  const style = await page.addStyleTag({ content: css });
  const png = await page.screenshot();
  await style.evaluate((el) => (el as HTMLStyleElement).remove());
  const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
  // Screenshot pixels per CSS pixel (phones have a device pixel ratio above 1).
  const k = info.width / (await page.evaluate(() => innerWidth));
  const at = (x: number, y: number, c: Circle) => Math.hypot((x + 0.5) / k - c.x, (y + 0.5) / k - c.y);
  const counts = (x: number, y: number) => {
    if (inside && at(x, y, inside) > inside.r) return false;
    if (outside && at(x, y, outside) <= outside.r) return false;
    return true;
  };
  let lit = 0;
  for (let i = 0, p = 0; i < data.length; i += info.channels, p++) {
    if (Math.max(data[i], data[i + 1], data[i + 2]) > 24 && counts(p % info.width, Math.floor(p / info.width))) lit++;
  }
  return lit / (info.width * info.height);
}

export const sceneState = (page: Page, state: "live" | "off") =>
  expect(page.locator("#scene")).toHaveAttribute("data-scene", state, SETTLE);
export const live = (page: Page) => sceneState(page, "live");

/** The quality tier the page runs at (`#scene[data-tier]`), once it has decided. */
export async function tierOf(page: Page): Promise<Tier> {
  const tier = await page.locator("#scene").getAttribute("data-tier");
  return Number(tier) as Tier;
}

/**
 * Whether the drawing buffer is the canvas's client box at the device pixel ratio (capped at 2) times the tier's
 * render scale: nothing stretched. Adaptive quality may step down to tier 1 under slow software WebGL at any time.
 */
export async function bufferMatchesBox(page: Page): Promise<boolean> {
  const tier = await tierOf(page);
  return page.locator("#scene").evaluate((c: HTMLCanvasElement, scale) => {
    const pr = Math.min(devicePixelRatio || 1, 2) * scale;
    return Math.abs(c.width - c.clientWidth * pr) <= 1 && Math.abs(c.height - c.clientHeight * pr) <= 1;
  }, RENDER_SCALE[tier]);
}
