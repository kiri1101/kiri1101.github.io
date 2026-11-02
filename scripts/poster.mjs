// Regenerates public/orb-poster.avif from the real 3D scene at P = 0. The poster is the first paint and the
// LCP element; it stands in for the orb until three.js has loaded, and replaces it where WebGL is unavailable.
// Run after a build: npm run build && npm run poster
//
// Thousands of soft dots make a noisy alpha channel, and alpha was 80% of the file. So the orb is captured over
// the layers that sit behind it on the page (the studio backdrop and the glow) and the poster only fades out
// at its rim, where it blends into the live studio. The glow ends well inside the orb, so nothing is doubled.
import { chromium } from "@playwright/test";
import { statSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import sirv from "sirv";

/** Pixel size of the poster file (square). */
const SIZE = Number(process.env.POSTER_SIZE ?? 720);
const QUALITY = Number(process.env.POSTER_QUALITY ?? 45);
/**
 * The <img> is 52vh tall on wide screens: 480 CSS px in a 923 px tall desktop viewport. The capture uses that
 * viewport, so the particles keep their real size relative to the orb, at the pixel ratio that yields SIZE.
 */
const SIDE = 480;
const VIEW = { width: 1440, height: Math.round(SIDE / 0.52) };
/** Opaque out to this share of the poster's half-width (the orb's silhouette is at 0.91), then fading to its edge. */
const OPAQUE_TO = 0.86;
/** The glow's mean opacity: it pulses between 0.8 and 1 on the live page. */
const GLOW_OPACITY = 0.9;

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "public", "orb-poster.avif");

/** A radial alpha mask: 255 inside OPAQUE_TO, a smoothstep to 0 at the inscribed circle. */
function rimMask(size) {
  const mask = Buffer.alloc(size * size);
  const half = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const r = Math.hypot(x + 0.5 - half, y + 0.5 - half) / half;
      const t = Math.min(1, Math.max(0, (1 - r) / (1 - OPAQUE_TO)));
      mask[y * size + x] = Math.round(255 * t * t * (3 - 2 * t));
    }
  }
  return mask;
}

const server = createServer(sirv(join(root, "build", "client"), { single: true }));
await new Promise((done) => server.listen(0, "127.0.0.1", done));
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: VIEW, deviceScaleFactor: SIZE / SIDE });
  // Headless Chromium only has software WebGL, which the page refuses unless its test-only switch allows it.
  await page.addInitScript(() => {
    window.__orbitSceneTest = "allow-software-gl";
  });
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.waitForSelector('#scene[data-scene="live"]', { state: "attached", timeout: 30_000 });
  await page.waitForTimeout(1500); // let the frost drift off the surface, as it looks once the page has settled

  // Keep the canvas and what lies behind the orb; hide the copy, the header and the floor shadow.
  await page.addStyleTag({
    content:
      "body * { visibility: hidden !important; }" +
      " #studio, #glow, #scene { visibility: visible !important; }" +
      ` #glow { opacity: ${GLOW_OPACITY} !important; }`,
  });
  const core = await page.evaluate(() => {
    const glow = document.getElementById("glow");
    return { x: parseFloat(glow.style.left), y: parseFloat(glow.style.top) };
  });
  const png = await page.screenshot({ clip: { x: core.x - SIDE / 2, y: core.y - SIDE / 2, width: SIDE, height: SIDE } });
  // RGB plus the rim mask as alpha, assembled by hand (sharp would drop a joined channel after removeAlpha).
  const rgb = await sharp(png).resize(SIZE, SIZE).removeAlpha().raw().toBuffer();
  const mask = rimMask(SIZE);
  const rgba = Buffer.alloc(SIZE * SIZE * 4);
  for (let i = 0; i < SIZE * SIZE; i++) {
    rgb.copy(rgba, i * 4, i * 3, i * 3 + 3);
    rgba[i * 4 + 3] = mask[i];
  }
  await sharp(rgba, { raw: { width: SIZE, height: SIZE, channels: 4 } })
    .avif({ quality: QUALITY, effort: 9, chromaSubsampling: "4:2:0" })
    .toFile(out);
  console.log(`poster: ${out} ${SIZE}x${SIZE}, ${(statSync(out).size / 1024).toFixed(1)} KB (orb core at ${core.x}, ${core.y})`);
} finally {
  await browser.close();
  server.close();
}
