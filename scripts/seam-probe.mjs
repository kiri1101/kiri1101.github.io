// Dev-only probe of the seam between the DOM and a scene drawn from a worker, while the black hole opens. Never
// shipped (scripts/ is not built).
//
// OffscreenCanvas frames from a worker are composited independently of the page's DOM updates, so the hole's DOM
// window (#hole) and the scene's clip to it can be a frame apart. This scrolls through the opening with mouse-wheel
// steps in headed Chromium (real GPU), records the composited frames with a CDP screencast, and for every frame
// measures the scene's ink outside the window the DOM had in that same frame:
// - every layer but the window and the canvas is hidden over black, and the window shows pure green, so each frame
//   carries its own window: a circle fitted to the green region's edge;
// - ink is any non-green pixel brighter than the clear colour; its distance past the circle is the seam.
// Hiding the other layers removes their painting cost (the horizon's glow above all), so the page runs faster than
// it would with them; the measured seam is the one between the two threads' frames.
//
//   npm run build && node scripts/seam-probe.mjs [--variants base,main-thread] [--rounds 3] [--out <dir>]
//                                                [--step 100] [--every 50] [--from 2.4] [--to 3.2] [--port 4192]
//     --step / --every   wheel delta in px and ms between wheel events (100 px every 50 ms is a brisk scroll)
//     --out              where frames past the threshold and the per-frame JSON go
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import sirv from "sirv";

const VARIANTS = {
  base: { about: "the page as built: the scene draws from a worker" },
  "main-thread": {
    about: "the scene on the main thread (the worker path's feature gate removed): DOM and scene in the same frame",
    init: () => {
      delete HTMLCanvasElement.prototype.transferControlToOffscreen;
    },
  },
};

const opts = { variants: ["base", "main-thread"], rounds: 3, out: null, step: 100, every: 50, from: 2.4, to: 3.2, port: 4192 };
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  const key = argv[i];
  const next = () => argv[++i];
  if (key === "--variants") opts.variants = next().split(",");
  else if (key === "--rounds") opts.rounds = Number(next());
  else if (key === "--out") opts.out = next();
  else if (key === "--step") opts.step = Number(next());
  else if (key === "--every") opts.every = Number(next());
  else if (key === "--from") opts.from = Number(next());
  else if (key === "--to") opts.to = Number(next());
  else if (key === "--port") opts.port = Number(next());
  else throw new Error(`seam-probe: unknown option ${key}`);
}
for (const v of opts.variants) if (!VARIANTS[v]) throw new Error(`seam-probe: unknown variant ${v}`);
if (opts.out) mkdirSync(opts.out, { recursive: true });

/** The window, the canvas and nothing else, over black; the window shows pure green. */
const MARK_CSS =
  "html { scrollbar-width: none !important; } ::-webkit-scrollbar { display: none !important; }" +
  " html, body { background: #000 !important; } body * { visibility: hidden !important; }" +
  " #hole, #space-frame, #scene { visibility: visible !important; }" +
  " #space { display: none !important; } #space-frame { background: #00ff00 !important; }";

/** Seam past the window's edge that counts as visible: beyond the 1.5 px soft edge and antialiasing. */
const SEAM_PX = 2;

const isGreen = (r, g, b) => g > 150 && r < 110 && b < 110;

/** Least-squares circle through points (Kasa's fit). */
function fitCircle(points) {
  let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0, sxz = 0, syz = 0, sz = 0;
  for (const [x, y] of points) {
    const z = x * x + y * y;
    sx += x; sy += y; sxx += x * x; syy += y * y; sxy += x * y; sxz += x * z; syz += y * z; sz += z;
  }
  const n = points.length;
  // Solve [sxx sxy sx; sxy syy sy; sx sy n] [a b c] = [-sxz -syz -sz] for x² + y² + ax + by + c = 0.
  const A = [[sxx, sxy, sx], [sxy, syy, sy], [sx, sy, n]];
  const B = [-sxz, -syz, -sz];
  const det = (m) =>
    m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
  const D = det(A);
  const col = (k) => A.map((row, i) => row.map((v, j) => (j === k ? B[i] : v)));
  const [a, b, c] = [0, 1, 2].map((k) => det(col(k)) / D);
  const x = -a / 2;
  const y = -b / 2;
  return { x, y, r: Math.sqrt(x * x + y * y - c) };
}

/** One composited frame: the window's circle and the scene's ink outside it, in CSS px of a 1440 px wide viewport. */
async function analyse(png) {
  const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: C } = info;
  const k = W / 1440; // frame pixels per CSS pixel
  const at = (x, y) => (y * W + x) * C;
  let green = 0;
  const edge = [];
  for (let y = 0; y < H; y++) {
    let first = -1;
    let last = -1;
    for (let x = 0; x < W; x++) {
      const i = at(x, y);
      if (isGreen(data[i], data[i + 1], data[i + 2])) {
        green++;
        if (first < 0) first = x;
        last = x;
      }
    }
    if (first > 0) edge.push([first, y]);
    if (last >= 0 && last < W - 1) edge.push([last, y]);
  }
  if (green < 400) return { state: "closed" };
  if (green > W * H * 0.97 || edge.length < 40) return { state: "open" };
  const c = fitCircle(edge);
  let outside = 0;
  let worst = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = at(x, y);
      const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
      if (Math.max(r, g, b) <= 24 || isGreen(r, g, b)) continue;
      const past = (Math.hypot(x + 0.5 - c.x, y + 0.5 - c.y) - c.r) / k;
      if (past > SEAM_PX) {
        outside++;
        worst = Math.max(worst, past);
      }
    }
  }
  const css = (v) => +(v / k).toFixed(1);
  return { state: "disc", circle: { x: css(c.x), y: css(c.y), r: css(c.r) }, outside, worstPx: +worst.toFixed(1) };
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const server = createServer(sirv(resolve(root, "build/client"), { single: true }));
await new Promise((done) => server.listen(opts.port, "127.0.0.1", done));
const url = `http://127.0.0.1:${opts.port}/`;
const results = [];
const browser = await chromium.launch({ headless: false });
try {
  for (let round = 0; round < opts.rounds; round++) {
    const order = round % 2 ? [...opts.variants].reverse() : opts.variants;
    for (const variant of order) {
      const v = VARIANTS[variant];
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
      if (v.init) await context.addInitScript(v.init);
      const page = await context.newPage();
      await page.goto(url, { waitUntil: "load" });
      await page.waitForSelector('#scene[data-scene="live"]', { state: "attached", timeout: 30_000 });
      await page.waitForTimeout(8000); // adaptive quality settles
      const unit = await page.evaluate(() => document.getElementById("unit-probe").getBoundingClientRect().height);
      await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), opts.from * unit);
      await page.addStyleTag({ content: MARK_CSS });
      // Hiding the scrollbar widens the content box; the page re-measures its stage only on a window resize.
      await page.evaluate(() => window.dispatchEvent(new Event("resize")));
      await page.bringToFront();
      await page.waitForTimeout(2500);
      const tier = await page.evaluate(() => document.getElementById("scene").dataset.tier);

      const cdp = await context.newCDPSession(page);
      const frames = [];
      cdp.on("Page.screencastFrame", (f) => {
        frames.push({ t: f.metadata.timestamp, png: Buffer.from(f.data, "base64") });
        cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => undefined);
      });
      await cdp.send("Page.startScreencast", { format: "png", everyNthFrame: 1, maxWidth: 1440, maxHeight: 900 });
      await page.mouse.move(720, 450);
      const steps = Math.ceil(((opts.to - opts.from) * unit) / opts.step);
      for (let s = 0; s < steps; s++) {
        await page.mouse.wheel(0, opts.step);
        await page.waitForTimeout(opts.every);
      }
      await page.waitForTimeout(1500); // the smoothed P settles
      await cdp.send("Page.stopScreencast");
      const P = await page.evaluate(() => scrollY / document.getElementById("unit-probe").getBoundingClientRect().height);
      await context.close();

      const measured = [];
      for (const [k, f] of frames.entries()) {
        const a = await analyse(f.png);
        measured.push({ frame: k, t: f.t, ...a });
        if (opts.out && a.state === "disc" && a.outside > 0) {
          writeFileSync(join(opts.out, `${variant}-r${round + 1}-f${String(k).padStart(3, "0")}.png`), f.png);
        }
      }
      const discs = measured.filter((m) => m.state === "disc");
      const seams = discs.filter((m) => m.outside > 0);
      const worst = seams.reduce((w, m) => (m.worstPx > (w?.worstPx ?? -1) ? m : w), null);
      results.push({ round: round + 1, variant, tier, endP: +P.toFixed(2), frames: frames.length, discFrames: discs.length, seamFrames: seams.length, worst, measured });
      console.log(
        `${variant.padEnd(12)} round ${round + 1}: tier ${tier}, ${frames.length} frames, ${discs.length} with the window as a disc, ` +
          `${seams.length} with scene ink > ${SEAM_PX} px outside it` +
          (worst ? `; worst: ${worst.outside} px of ink, up to ${worst.worstPx} px out (r ${worst.circle.r})` : "") +
          ` [P ${opts.from} → ${P.toFixed(2)}]`,
      );
    }
  }
} finally {
  await browser.close();
  server.close();
}
if (opts.out) writeFileSync(join(opts.out, "seam.json"), JSON.stringify({ opts, results }, null, 2));
for (const variant of opts.variants) {
  const mine = results.filter((r) => r.variant === variant);
  const all = mine.flatMap((r) => r.measured.filter((m) => m.state === "disc"));
  const out = all.map((m) => m.outside).sort((a, b) => a - b);
  const pct = (p) => out[Math.min(out.length - 1, Math.floor(p * out.length))] ?? 0;
  console.log(
    `${variant}: ${all.length} disc frames over ${mine.length} rounds; ink pixels outside per frame: median ${pct(0.5)}, ` +
      `p90 ${pct(0.9)}, max ${pct(1)}; frames with any: ${all.filter((m) => m.outside > 0).length}; ` +
      `worst extent ${Math.max(0, ...all.map((m) => m.worstPx ?? 0))} px`,
  );
}
