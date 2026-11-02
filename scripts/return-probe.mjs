// Dev-only probe of the return to the galaxy ("Back to orbit" on a case study), in headed Chromium with the real GPU.
// Never shipped (scripts/ is not built).
//
// A CDP screencast records every composited frame from just before the click until the galaxy has settled. For each
// frame it measures:
// - the galaxy core's light: the mean luminance of a small disc around the core (where the page centres its glow);
// - the focused card's light: the mean luminance over the card's pixels, found in the settled frame as the region
//   that the galaxy added over the bare deep field and that is not near the core.
// It reports the largest single-frame step of the core's light (the gate's limit: about 40) and how long after the
// galaxy's first frame the focused card shows (limit: about 150 ms). Frames and a JSON go to --out.
//
//   npm run build && node scripts/return-probe.mjs [--from kumo-home] [--sizes 1440x900,390x844] [--out <dir>]
//                                                  [--port 4193] [--rounds 1]
import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const opts = { from: "kumo-home", sizes: ["1440x900", "390x844"], out: null, port: 4193, rounds: 1 };
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  const key = argv[i];
  const next = () => argv[++i];
  if (key === "--from") opts.from = next();
  else if (key === "--sizes") opts.sizes = next().split(",");
  else if (key === "--out") opts.out = next();
  else if (key === "--port") opts.port = Number(next());
  else if (key === "--rounds") opts.rounds = Number(next());
  else throw new Error(`return-probe: unknown option ${key}`);
}

/** A rise above the bare deep field that counts as "showing". */
const SHOWING = 8;
/** The core disc's radius, in CSS px. */
const CORE_R = 10;

const lum = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

async function decode(png) {
  const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height, c: info.channels };
}

const meanOver = (img, pixels) => {
  let sum = 0;
  for (const p of pixels) {
    const i = p * img.c;
    sum += lum(img.data[i], img.data[i + 1], img.data[i + 2]);
  }
  return pixels.length ? sum / pixels.length : 0;
};

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const server = spawn(process.execPath, [join(root, "scripts", "serve-compressed.mjs"), "--port", String(opts.port)], {
  stdio: ["ignore", "pipe", "inherit"],
});
await new Promise((resolve) => server.stdout.once("data", resolve));
const base = `http://127.0.0.1:${opts.port}`;
const results = [];
const browser = await chromium.launch({ headless: false });
try {
  for (let round = 1; round <= opts.rounds; round++) {
    for (const size of opts.sizes) {
      const [vw, vh] = size.split("x").map(Number);
      const phone = vw < 760;
      const context = await browser.newContext({
        viewport: { width: vw, height: vh },
        deviceScaleFactor: phone ? 2 : 1,
        isMobile: phone,
        hasTouch: phone,
      });
      // When the page's view transition ends (wall clock), so the galaxy is looked for only after the cross-fade; when
      // the scene turns live; and the main thread's long tasks, to tell a stall on the page from a screencast gap.
      await context.addInitScript(() => {
        window.__longTasks = [];
        new PerformanceObserver((list) => {
          for (const e of list.getEntries()) {
            window.__longTasks.push({ at: Math.round(performance.timeOrigin + e.startTime), ms: Math.round(e.duration) });
          }
        }).observe({ type: "longtask", buffered: true });
        new MutationObserver(() => {
          if (!window.__liveAt && document.querySelector('#scene[data-scene="live"]')) window.__liveAt = Date.now();
        }).observe(document, { subtree: true, attributes: true, attributeFilter: ["data-scene"] });
        const start = Document.prototype.startViewTransition;
        if (typeof start !== "function") return;
        Document.prototype.startViewTransition = function (...args) {
          const t = start.apply(this, args);
          t.finished.finally(() => {
            window.__vtEnd = Date.now();
          });
          return t;
        };
      });
      const page = await context.newPage();
      await page.goto(`${base}/en/projects/${opts.from}`, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      await page.bringToFront();
      await page.waitForTimeout(800);

      const cdp = await context.newCDPSession(page);
      const frames = [];
      cdp.on("Page.screencastFrame", (f) => {
        frames.push({ t: f.metadata.timestamp * 1000, png: Buffer.from(f.data, "base64") });
        cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => undefined);
      });
      // JPEG is cheaper to encode than PNG, so the screencast drops fewer frames while the scene builds.
      await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, everyNthFrame: 1, maxWidth: vw, maxHeight: vh });
      await page.waitForTimeout(400);
      const clickAt = Date.now();
      await page.getByRole("link", { name: "Back to orbit" }).click();
      // A fixed wait, not a polling one: nothing the probe does should touch the page while the galaxy fades in.
      await page.waitForTimeout(5000);
      await cdp.send("Page.stopScreencast");
      const core = await page.evaluate(() => {
        const g = document.getElementById("glow");
        // The scene's worker script request: when the page started the scene (wall clock).
        const worker = performance.getEntriesByType("resource").find((r) => /scene\.worker/.test(r.name));
        return {
          x: parseFloat(g.style.left),
          y: parseFloat(g.style.top),
          focused: document.getElementById("title")?.textContent,
          vtEnd: window.__vtEnd ?? null,
          liveAt: window.__liveAt ?? null,
          longTasks: window.__longTasks,
          workerStart: worker ? Math.round(performance.timeOrigin + worker.startTime) : null,
        };
      });
      if (!core.liveAt) throw new Error(`${size}: the scene did not go live`);
      await context.close();

      // ---------- analysis ----------
      // Frames can arrive out of order; the analysis follows their timestamps.
      frames.sort((a, b) => a.t - b.t);
      const imgs = [];
      for (const f of frames) imgs.push(await decode(f.png));
      const { w, h } = imgs[0];
      const k = w / vw; // frame pixels per CSS pixel
      const disc = [];
      for (let y = Math.floor((core.y - CORE_R) * k); y <= Math.ceil((core.y + CORE_R) * k); y++) {
        for (let x = Math.floor((core.x - CORE_R) * k); x <= Math.ceil((core.x + CORE_R) * k); x++) {
          if (x >= 0 && y >= 0 && x < w && y < h && Math.hypot(x / k - core.x, y / k - core.y) <= CORE_R) disc.push(y * w + x);
        }
      }
      const coreLight = imgs.map((img) => meanOver(img, disc));
      // The bare deep field: the first frame after the cross-fade (or after the click, without one); the galaxy's
      // first frame is the first one after it whose core is brighter than that.
      const fieldFrom = core.vtEnd ?? clickAt;
      const fieldAt = frames.findIndex((f) => f.t >= fieldFrom);
      const fieldLight = coreLight[fieldAt];
      const galaxyAt = coreLight.findIndex((l, i) => i > fieldAt && l > fieldLight + SHOWING);
      const baseline = imgs[Math.max(0, galaxyAt - 1)];
      const settled = imgs.at(-1);
      // The focused card: pixels the galaxy made much brighter than the bare field, away from the core and the stars'
      // densest part (a large connected rectangle; small stars are dropped by the brightness and area test).
      const card = [];
      for (let p = 0; p < w * h; p++) {
        const x = (p % w) / k;
        const y = Math.floor(p / w) / k;
        if (Math.hypot(x - core.x, y - core.y) < 140) continue;
        const i = p * settled.c;
        const d = lum(settled.data[i], settled.data[i + 1], settled.data[i + 2]) - lum(baseline.data[i], baseline.data[i + 1], baseline.data[i + 2]);
        if (d > 60) card.push(p);
      }
      const cardLight = imgs.map((img) => meanOver(img, card));
      const cardBase = cardLight[Math.max(0, galaxyAt - 1)];
      const cardAt = cardLight.findIndex((l, i) => i >= galaxyAt && l > cardBase + SHOWING);
      // The core's step between captured frames, from the galaxy's first frame until it settles. The screencast can
      // skip rendered frames (under load it sometimes misses a few hundred ms), so each step is also given per 60 Hz
      // frame: the light the scene added in one frame on screen.
      const steps = coreLight.map((l, i) => (i === 0 || i < galaxyAt ? 0 : l - coreLight[i - 1]));
      const perFrame = steps.map((s, i) => (i === 0 ? 0 : s / Math.max(1, (frames[i].t - frames[i - 1].t) / (1000 / 60))));
      const worst = steps.reduce((m, s, i) => (Math.abs(s) > Math.abs(m.step) ? { step: s, frame: i } : m), { step: 0, frame: 0 });
      const worstPerFrame = perFrame.reduce((m, s) => Math.max(m, Math.abs(s)), 0);
      const gapAtWorst = worst.frame > 0 ? Math.round(frames[worst.frame].t - frames[worst.frame - 1].t) : 0;
      const t0 = frames[galaxyAt]?.t ?? NaN;
      const result = {
        round,
        size,
        focused: core.focused,
        frames: frames.length,
        galaxyFirstFrame: galaxyAt,
        galaxyFirstMsAfterClick: Math.round(t0 - clickAt),
        crossFadeEndMsAfterClick: core.vtEnd ? core.vtEnd - clickAt : null,
        sceneStartMsAfterClick: core.workerStart ? core.workerStart - clickAt : null,
        liveMsAfterClick: core.liveAt - clickAt,
        longTasksAfterClick: core.longTasks.filter((l) => l.at >= clickAt).map((l) => `${l.ms} ms at ${l.at - clickAt}`),
        coreLight: { field: +fieldLight.toFixed(1), settled: +coreLight.at(-1).toFixed(1) },
        maxCoreStep: +worst.step.toFixed(1),
        maxCoreStepFrame: worst.frame,
        maxCoreStepGapMs: gapAtWorst,
        maxCoreStepPer60HzFrame: +worstPerFrame.toFixed(1),
        cardPixels: card.length,
        cardFirstFrame: cardAt,
        cardAfterGalaxyMs: cardAt >= 0 ? Math.round(frames[cardAt].t - t0) : null,
        rampFrames: coreLight.findIndex((l, i) => i > galaxyAt && l >= coreLight.at(-1) * 0.95) - galaxyAt,
        series: frames.map((f, i) => ({
          i,
          ms: Math.round(f.t - clickAt),
          core: +coreLight[i].toFixed(1),
          card: +cardLight[i].toFixed(1),
        })),
      };
      results.push(result);
      console.log(
        `${size} round ${round}: ${frames.length} frames; cross-fade ends ${result.crossFadeEndMsAfterClick} ms, scene starts ` +
          `${result.sceneStartMsAfterClick} ms, galaxy first frame ${result.galaxyFirstMsAfterClick} ms after the click; ` +
          `core light ${result.coreLight.field} → ${result.coreLight.settled}, largest step between captured frames ` +
          `${result.maxCoreStep} (frame ${worst.frame}, ${gapAtWorst} ms after the one before), largest per 60 Hz frame ` +
          `${result.maxCoreStepPer60HzFrame}; focused card (${card.length} px) showing ${result.cardAfterGalaxyMs} ms after the galaxy's ` +
          `first frame; ${result.rampFrames} frames to 95% light; live at ${result.liveMsAfterClick} ms; long tasks: ` +
          `${result.longTasksAfterClick.join(", ") || "none"}`,
      );
      if (opts.out) {
        const dir = join(opts.out, `${size}-r${round}`);
        mkdirSync(dir, { recursive: true });
        // The frames around the return: from the page change until the light settles.
        const from = Math.max(0, galaxyAt - 4);
        const to = Math.min(frames.length - 1, galaxyAt + (result.rampFrames > 0 ? result.rampFrames : 30) + 8);
        for (let i = from; i <= to; i++) {
          writeFileSync(join(dir, `f${String(i).padStart(3, "0")}-${String(result.series[i].ms).padStart(5, "0")}ms.jpg`), frames[i].png);
        }
      }
    }
  }
} finally {
  await browser.close();
  server.kill();
}
if (opts.out) writeFileSync(join(opts.out, "return.json"), JSON.stringify({ opts, results }, null, 2));
