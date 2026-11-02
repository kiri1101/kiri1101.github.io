// Dev-only frame-rate probe for the home page on this machine's real GPU. Never shipped (scripts/ is not built).
//
// Serves build/client (or other builds) in-process, opens headed Chromium (hardware WebGL; headless Chromium only
// has SwiftShader, so its numbers mean nothing), and counts requestAnimationFrame callbacks for a few seconds at
// each scroll position P. Runs are interleaved across variants and repeated in rounds; the report gives each median.
//
// Two rates per measurement: the page's (main-thread frames: the DOM layers, and the scene too when it renders on
// the main thread) and the scene's (frames of the scene worker, counted inside it; the page's rate when there is no
// worker). The quality tier each count ran at (#scene[data-tier]) is reported too: adaptive quality steps slow
// GPUs down a few seconds after the scene goes live, so counting starts --warm ms after that.
//
// The (a)-(d) variants switch off the suspects of Task 6P in the build that still masked the black hole with CSS
// (25f52c1); on later builds the masks are gone and those variants change nothing. A laptop GPU slows down as it
// heats: let it rest between long runs, and trust interleaved medians over single runs.
//
//   npm run build && node scripts/fps-probe.mjs [options]
//     --p 0,2.7,2.95,4.9        scroll positions, in scroll units (viewport heights)
//     --variants base,no-scene-mask
//                               A/B switches, each applied on its own before any page script (see VARIANTS)
//     --dirs before=<dir>,after=build/client
//                               builds to compare, each served on its own port (default: build/client); every
//                               build runs every variant, interleaved with the others
//     --rounds 3                interleaved rounds; the order of build x variant rotates each round
//     --seconds 4               counting window per measurement
//     --settle 2500             ms after the scroll before counting (the page smooths P for about 1 s)
//     --warm 8000               ms after the scene goes live before the first scroll (adaptive quality settles)
//     --size 1440x900           viewport, at device pixel ratio 1
//     --port 4190               port of the in-process server
//     --shots <dir> --label x   also save a screenshot per variant and P (first round) as <label>-<variant>-P<P>.png
//     --json <file>             also write every run as JSON
//     --parity <dir>            no frame counting: save a deterministic screenshot per build x variant and P in <dir>
//                               (seeded Math.random, a frozen clock, scrollY pinned to P), plus a second capture of
//                               the first target as the noise floor, and print each one's pixel difference from the
//                               first target (with an amplified difference image). The freeze reaches the page only:
//                               add the main-thread variant so the scene draws there, not in a worker
//     --extra <module.mjs>      more variants, from a module whose default export has the shape of VARIANTS
//     --list                    print the variants and exit
//
// Measure with nothing else rendering, one probe at a time. The browser and the server stop when it ends.
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import sharp from "sharp";
import sirv from "sirv";

/**
 * One suspect switched off at a time. `css` is added with !important, so it beats the inline styles the page
 * writes each frame; `init` runs in the page before its own scripts.
 */
const VARIANTS = {
  base: { about: "the page as built (the scene renders from a worker where Chromium can transfer the canvas)" },
  "main-thread": {
    about: "the scene on the main thread: the worker path's feature gate removed (as the R27 e2e test does)",
    init: () => {
      delete HTMLCanvasElement.prototype.transferControlToOffscreen;
    },
  },
  "scene-off": {
    about: "no 3D scene: the poster path (the page's test-only switch), as without capable WebGL",
    init: () => {
      window.__orbitSceneTest = "off";
    },
  },
  "no-scene-mask": {
    about: "(a) no mask on #scene, the WebGL canvas",
    css: "#scene { mask-image: none !important; -webkit-mask-image: none !important; }",
  },
  "no-studio-mask": {
    about: "(b) no mask on #studio",
    css: "#studio { mask-image: none !important; -webkit-mask-image: none !important; }",
  },
  "no-masks": {
    about: "(a)+(b) no mask on #scene or #studio",
    css:
      "#scene, #studio { mask-image: none !important; -webkit-mask-image: none !important; }",
  },
  "horizon-transform": {
    about: "(c) #horizon kept 1000 px and scaled with transform instead of resized",
    init: () => {
      const FIXED = 1000;
      const raf = window.requestAnimationFrame.bind(window);
      const after = () => {
        const h = document.getElementById("horizon");
        const w = h?.style.width;
        if (!h || !w || w === `${FIXED}px`) return;
        const s = parseFloat(w) / FIXED;
        h.style.width = h.style.height = `${FIXED}px`;
        h.style.transform = `translate(-50%, -50%) scale(${s})`;
      };
      window.requestAnimationFrame = (cb) =>
        raf((t) => {
          cb(t);
          after();
        });
    },
  },
  "horizon-fixed": {
    about: "(c') #horizon held at 1000 px: never resized, never scaled",
    css: "#horizon { width: 1000px !important; height: 1000px !important; }",
  },
  "horizon-off": {
    about: "(c'') #horizon not drawn at all",
    css: "#horizon { display: none !important; }",
  },
  "no-draw": {
    about: "(d) the scene issues no WebGL draw calls (it still clears)",
    init: () => {
      for (const proto of [WebGL2RenderingContext.prototype, WebGLRenderingContext.prototype]) {
        for (const name of ["drawArrays", "drawElements", "drawArraysInstanced", "drawElementsInstanced", "drawRangeElements"]) {
          if (proto[name]) proto[name] = function () {};
        }
      }
    },
  },
  "no-stars": {
    about: "(d') the scene skips its point draws (stars; the orb and frost are hidden in the hole anyway)",
    init: () => {
      const proto = WebGL2RenderingContext.prototype;
      const drawArrays = proto.drawArrays;
      proto.drawArrays = function (mode, first, count) {
        if (mode === this.POINTS) return;
        return drawArrays.call(this, mode, first, count);
      };
    },
  },
  "no-clip-pass": {
    about: "the scene skips its black-hole clip pass (the draw blended ZERO, SRC_ALPHA)",
    init: () => {
      const proto = WebGL2RenderingContext.prototype;
      let clipBlend = false;
      const blendFunc = proto.blendFunc;
      proto.blendFunc = function (s, d) {
        clipBlend = s === this.ZERO && d === this.SRC_ALPHA;
        return blendFunc.call(this, s, d);
      };
      const blendFuncSeparate = proto.blendFuncSeparate;
      proto.blendFuncSeparate = function (s, d, sa, da) {
        clipBlend = s === this.ZERO && d === this.SRC_ALPHA;
        return blendFuncSeparate.call(this, s, d, sa, da);
      };
      const drawElements = proto.drawElements;
      proto.drawElements = function (...args) {
        if (clipBlend) return;
        return drawElements.apply(this, args);
      };
    },
  },
  "no-core": {
    about: "(d'') the scene skips its indexed draws (the galaxy core sprite; cards are hidden in the hole)",
    init: () => {
      WebGL2RenderingContext.prototype.drawElements = function () {};
    },
  },
};

function parseArgs(argv) {
  const o = {
    p: [0, 2.7, 2.95, 4.9],
    variants: ["base"],
    rounds: 3,
    seconds: 4,
    settle: 2500,
    warm: 8000,
    size: { width: 1440, height: 900 },
    port: 4190,
    dirs: [{ label: "", dir: "build/client" }],
    shots: null,
    label: "run",
    json: null,
    list: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i];
    const next = () => argv[++i];
    if (key === "--p") o.p = next().split(",").map(Number);
    else if (key === "--variants") o.variants = next().split(",");
    else if (key === "--dirs") {
      o.dirs = next()
        .split(",")
        .map((pair) => {
          const [label, dir] = pair.split("=");
          return { label, dir };
        });
    }
    else if (key === "--rounds") o.rounds = Number(next());
    else if (key === "--seconds") o.seconds = Number(next());
    else if (key === "--settle") o.settle = Number(next());
    else if (key === "--warm") o.warm = Number(next());
    else if (key === "--size") {
      const [width, height] = next().split("x").map(Number);
      o.size = { width, height };
    } else if (key === "--port") o.port = Number(next());
    else if (key === "--shots") o.shots = next();
    else if (key === "--label") o.label = next();
    else if (key === "--json") o.json = next();
    else if (key === "--extra") o.extra = next();
    else if (key === "--parity") o.parity = next();
    else if (key === "--list") o.list = true;
    else throw new Error(`fps-probe: unknown option ${key}`);
  }
  return o;
}

const median = (a) => {
  const s = [...a].sort((x, y) => x - y);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

const opts = parseArgs(process.argv.slice(2));
if (opts.extra) Object.assign(VARIANTS, (await import(pathToFileURL(resolve(opts.extra)).href)).default);
for (const v of opts.variants) if (!VARIANTS[v]) throw new Error(`fps-probe: unknown variant ${v} (try --list)`);
if (opts.list) {
  for (const [name, v] of Object.entries(VARIANTS)) console.log(name.padEnd(18), v.about);
  process.exit(0);
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const servers = [];
/** Every build x variant, labelled "build/variant" when more than one build is compared. */
const targets = [];
for (const [i, { label, dir }] of opts.dirs.entries()) {
  const server = createServer(sirv(resolve(root, dir), { single: true }));
  await new Promise((done) => server.listen(opts.port + i, "127.0.0.1", done));
  servers.push(server);
  for (const variant of opts.variants) {
    const name = opts.dirs.length > 1 ? `${label}/${variant}` : variant;
    targets.push({ name, variant, url: `http://127.0.0.1:${opts.port + i}/` });
  }
}
if (opts.shots) mkdirSync(opts.shots, { recursive: true });

/**
 * Runs in the page before its scripts, for --parity: the same random numbers on every load (the star field and
 * the orb's particles), a clock that never moves (twinkle, pulses and sway frozen at time 0), and scrollY pinned
 * to P, so the page starts at P without smoothing towards it. Fixed layers do not depend on the real scroll.
 */
function freezeAt(P) {
  let a = 0x2f6b4a1d;
  Math.random = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const T = 1000;
  performance.now = () => T;
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) => raf(() => cb(T));
  const y = () => P * (document.getElementById("unit-probe")?.getBoundingClientRect().height || innerHeight);
  Object.defineProperty(window, "scrollY", { get: y });
  Object.defineProperty(window, "pageYOffset", { get: y });
  // The real cursor over the headed window would tilt the camera (pointer parallax) and move the hole.
  window.addEventListener("pointermove", (e) => e.stopImmediatePropagation(), true);
}

/** Per-pixel difference of two same-sized screenshots (largest channel difference), and an amplified image of it. */
async function compare(fileA, fileB, out) {
  const [A, B] = await Promise.all([fileA, fileB].map((f) => sharp(f).removeAlpha().raw().toBuffer({ resolveWithObject: true })));
  const { width, height } = A.info;
  const n = width * height;
  const img = Buffer.alloc(n);
  let max = 0;
  let sum = 0;
  const over = { 2: 0, 8: 0, 32: 0 };
  for (let p = 0; p < n; p++) {
    const i = p * 3;
    const d = Math.max(Math.abs(A.data[i] - B.data[i]), Math.abs(A.data[i + 1] - B.data[i + 1]), Math.abs(A.data[i + 2] - B.data[i + 2]));
    img[p] = Math.min(255, d * 8);
    max = Math.max(max, d);
    sum += d;
    for (const k of [2, 8, 32]) if (d > k) over[k]++;
  }
  await sharp(img, { raw: { width, height, channels: 1 } }).png().toFile(out);
  const pct = (c) => `${((100 * c) / n).toFixed(3)}%`;
  return `max ${max}, mean ${(sum / n).toFixed(3)}, >2: ${pct(over[2])}, >8: ${pct(over[8])}, >32: ${pct(over[32])}`;
}

if (opts.parity) {
  mkdirSync(opts.parity, { recursive: true });
  const safe = (name) => name.replace(/[^\w.-]+/g, "-");
  const captures = [...targets, { ...targets[0], name: `${targets[0].name}-again` }];
  const files = {};
  const browser = await chromium.launch({ headless: false });
  try {
    for (const P of opts.p) {
      for (const target of captures) {
        const v = VARIANTS[target.variant];
        const context = await browser.newContext({ viewport: opts.size, deviceScaleFactor: 1 });
        await context.addInitScript(freezeAt, P);
        if (v.init) await context.addInitScript(v.init);
        const page = await context.newPage();
        await page.goto(target.url, { waitUntil: "load" });
        if (v.css) await page.addStyleTag({ content: v.css });
        await page
          .waitForFunction(() => /live|off/.test(document.getElementById("scene")?.dataset.scene ?? ""), null, { timeout: 30_000 })
          .catch(() => undefined);
        await page.waitForTimeout(opts.settle);
        const file = join(opts.parity, `${opts.label}-${safe(target.name)}-P${P}.png`);
        await page.screenshot({ path: file });
        (files[P] ??= []).push({ name: target.name, file });
        await context.close();
      }
    }
  } finally {
    await browser.close();
    for (const server of servers) server.close();
  }
  for (const P of opts.p) {
    const [ref, ...others] = files[P];
    for (const other of others) {
      const out = join(opts.parity, `${opts.label}-diff-${safe(ref.name)}-vs-${safe(other.name)}-P${P}.png`);
      console.log(`P${P} ${ref.name} vs ${other.name}: ${await compare(ref.file, other.file, out)}`);
    }
  }
  process.exit(0);
}

/** Counts animation frames for `seconds`: frames per second, and the longest frame interval in ms. */
const countFrames = (seconds) =>
  new Promise((done) => {
    let n = 0;
    let prev = -1;
    let worst = 0;
    let t0 = -1;
    const tick = (t) => {
      if (t0 < 0) t0 = t;
      if (prev >= 0) worst = Math.max(worst, t - prev);
      prev = t;
      if (t - t0 < seconds * 1000) {
        n++;
        requestAnimationFrame(tick);
      } else done({ fps: n / ((t - t0) / 1000), worst });
    };
    requestAnimationFrame(tick);
  });

const runs = []; // { round, target, P, fps, worst, sceneFps, sceneWorst, thread, tier, scene }
const browser = await chromium.launch({ headless: false });
let info = null;
try {
  // The GPU's name, from a page of its own: a context made in a measured page would stay alive there.
  const probe = await browser.newPage();
  info = await probe.evaluate(() => {
    const gl = document.createElement("canvas").getContext("webgl2");
    const ext = gl?.getExtension("WEBGL_debug_renderer_info");
    return { renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "n/a", dpr: devicePixelRatio };
  });
  await probe.close();

  for (let round = 0; round < opts.rounds; round++) {
    const k = round % targets.length;
    const order = [...targets.slice(k), ...targets.slice(0, k)];
    for (const target of order) {
      const v = VARIANTS[target.variant];
      const context = await browser.newContext({ viewport: opts.size, deviceScaleFactor: 1 });
      if (v.init) await context.addInitScript(v.init);
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));
      await page.goto(target.url, { waitUntil: "load" });
      if (v.css) await page.addStyleTag({ content: v.css });
      const scene = await page
        .waitForFunction(() => /live|off/.test(document.getElementById("scene")?.dataset.scene ?? ""), null, {
          timeout: 30_000,
        })
        .then(() => page.evaluate(() => document.getElementById("scene").dataset.scene))
        .catch(() => "timeout");
      await page.waitForTimeout(scene === "live" ? opts.warm : 800);
      const worker = page.workers().find((w) => /\/scene\.worker-[\w-]+\.js$/.test(w.url())) ?? null;
      for (const P of opts.p) {
        await page.evaluate((P) => {
          const unit = document.getElementById("unit-probe")?.getBoundingClientRect().height || innerHeight;
          window.scrollTo({ top: P * unit, behavior: "instant" });
        }, P);
        await page.bringToFront(); // a window behind others is throttled
        await page.waitForTimeout(opts.settle);
        // The same window of time in the page and, when there is one, in the scene worker.
        const [main, inWorker] = await Promise.all([
          page.evaluate(countFrames, opts.seconds),
          worker ? worker.evaluate(countFrames, opts.seconds) : null,
        ]);
        const sceneRate = inWorker ?? main;
        const tier = await page.evaluate(() => document.getElementById("scene").dataset.tier ?? "-");
        runs.push({
          round,
          target: target.name,
          P,
          fps: +main.fps.toFixed(1),
          worst: Math.round(main.worst),
          sceneFps: +sceneRate.fps.toFixed(1),
          sceneWorst: Math.round(sceneRate.worst),
          thread: worker ? "worker" : "main",
          tier,
          scene,
        });
        if (opts.shots && round === 0) {
          const file = `${opts.label}-${target.name.replace("/", "-")}-P${P}.png`;
          await page.screenshot({ path: join(opts.shots, file) });
        }
      }
      if (errors.length) console.log(`page errors (${target.name}):`, errors.join(" | "));
      await context.close();
    }
  }
} finally {
  await browser.close();
  for (const server of servers) server.close();
}

console.log(`renderer: ${info?.renderer}  dpr ${info?.dpr}  viewport ${opts.size.width}x${opts.size.height}`);
console.log(
  `${opts.rounds} interleaved rounds, ${opts.seconds} s each, counting from ${opts.warm} ms after the scene went live; ` +
    "per P: scene fps median [runs] (worst frame ms), then page fps median [runs], and the tier(s) counted at",
);
for (const { name } of targets) {
  const mine = runs.filter((r) => r.target === name);
  const threads = [...new Set(mine.map((r) => r.thread))].join("/");
  console.log(`${name} (scene on the ${threads} thread)`);
  for (const P of opts.p) {
    const at = mine.filter((r) => r.P === P);
    const states = [...new Set(at.map((r) => r.scene))].join("/");
    const tiers = [...new Set(at.map((r) => r.tier))].join("/");
    console.log(
      `  P${P}`.padEnd(9) +
        `scene ${median(at.map((r) => r.sceneFps)).toFixed(1)} [${at.map((r) => r.sceneFps).join(" ")}] (${Math.max(...at.map((r) => r.sceneWorst))})` +
        `  page ${median(at.map((r) => r.fps)).toFixed(1)} [${at.map((r) => r.fps).join(" ")}] (${Math.max(...at.map((r) => r.worst))})` +
        `  tier ${tiers}${states === "live" ? "" : `  scene:${states}`}`,
    );
  }
}
if (opts.json) writeFileSync(opts.json, JSON.stringify({ info, opts, runs }, null, 2));
