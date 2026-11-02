// Captures the project imagery from the HTML/CSS compositions in scripts/mockups/<slug>.html. Each element with
// data-shot="<name>" becomes public/projects/<slug>/<name>.{avif,webp} (1600 w) and <name>-800.{avif,webp}:
// AVIF at quality 50, WebP at quality 70. The shots must be exactly the images the project's content file declares
// (its cover and each section's image), at the size it declares, plus the cover's portrait crop for phones right
// after the cover (PHONE_CROP, app/lib/images.ts). Rendered at 2x and scaled down, so text stays crisp.
// After new covers, run `npm run card-textures` (the projects test fails until you do).
//
//   npm run images                     every project
//   npm run images -- services-publics     one or more projects
//   npm run images -- --png <dir>      also write the 1600 w PNG of each shot to <dir>, for review
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { dirname, extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import matter from "gray-matter";
import sharp from "sharp";
import { IMAGE_WIDTHS, PHONE_CROP } from "../app/lib/images.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const contentDir = join(root, "content", "projects", "fr");
/** Largest first: the largest is written without a width suffix. */
const WIDTHS = [...IMAGE_WIDTHS].sort((a, b) => b - a);
const SCALE = 2;

const args = process.argv.slice(2);
const pngAt = args.indexOf("--png");
const pngDir = pngAt >= 0 ? args[pngAt + 1] : null;
const only = args.filter((a, i) => !a.startsWith("--") && (pngAt < 0 || i !== pngAt + 1));

type Shot = { name: string; width: number; height: number };

/** What the content file says the project's images are: its cover, then each section's image. */
function declaredShots(file: string): { slug: string; shots: Shot[] } {
  const { data } = matter(readFileSync(join(contentDir, file), "utf8"));
  const images = [data.cover, ...(data.sections ?? []).map((s: { image: unknown }) => s.image)] as {
    src: string;
    width: number;
    height: number;
  }[];
  const shots = images.map((img) => {
    const m = img.src.match(new RegExp(`^/projects/${data.slug}/([\\w-]+)\\.avif$`));
    if (!m) throw new Error(`${file}: ${img.src} is not /projects/${data.slug}/<name>.avif`);
    if (img.width !== WIDTHS[0]) throw new Error(`${file}: ${img.src} must be ${WIDTHS[0]} wide`);
    return { name: m[1], width: img.width, height: img.height };
  });
  // The cover's portrait crop for phones comes right after the cover.
  shots.splice(1, 0, { name: `${shots[0].name}${PHONE_CROP.suffix}`, width: PHONE_CROP.width, height: PHONE_CROP.height });
  return { slug: String(data.slug), shots };
}

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript",
  ".woff2": "font/woff2",
  ".svg": "image/svg+xml",
};

// The compositions load the self-hosted fonts from /app/fonts; served over HTTP so the fonts load (a file://
// page may not load fonts at all).
const server = createServer((req, res) => {
  const path = normalize(join(root, decodeURIComponent(new URL(req.url ?? "/", "http://x").pathname)));
  if (!path.startsWith(root + sep) || !existsSync(path) || !statSync(path).isFile()) {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, { "content-type": TYPES[extname(path)] ?? "application/octet-stream" });
  res.end(readFileSync(path));
});
await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

const browser = await chromium.launch({ args: process.env.CAPTURE_ARGS ? process.env.CAPTURE_ARGS.split(" ") : [] });
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1200 }, deviceScaleFactor: SCALE });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("requestfailed", (r) => errors.push(`failed: ${r.url()}`));
  page.on("response", (r) => r.status() >= 400 && errors.push(`${r.status()}: ${r.url()}`));

  const files = readdirSync(contentDir).filter((f) => f.endsWith(".md"));
  for (const file of files) {
    const { slug, shots } = declaredShots(file);
    if (only.length > 0 && !only.includes(slug)) continue;
    errors.length = 0;
    await page.goto(`${origin}/scripts/mockups/${slug}.html`, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    const found = await page.$$eval("[data-shot]", (els) =>
      els.map((el) => ({ name: el.getAttribute("data-shot")!, width: el.clientWidth, height: el.clientHeight })),
    );
    const want = JSON.stringify(shots);
    if (JSON.stringify(found) !== want) {
      throw new Error(`${slug}.html: shots ${JSON.stringify(found)} do not match the content's ${want}`);
    }
    if (errors.length > 0) throw new Error(`${slug}.html: ${errors.join("; ")}`);
    const outDir = join(root, "public", "projects", slug);
    mkdirSync(outDir, { recursive: true });
    for (const shot of shots) {
      const png = await page.locator(`[data-shot="${shot.name}"]`).screenshot({ animations: "disabled" });
      if (pngDir) {
        mkdirSync(pngDir, { recursive: true });
        await sharp(png).resize(WIDTHS[0]).png().toFile(join(pngDir, `${slug}-${shot.name}.png`));
      }
      const sizes: string[] = [];
      for (const w of WIDTHS) {
        const name = w === WIDTHS[0] ? shot.name : `${shot.name}-${w}`;
        const img = sharp(png).resize(w, Math.round((shot.height * w) / shot.width), { kernel: "lanczos3" });
        const avif = await img.clone().avif({ quality: 50, effort: 6 }).toFile(join(outDir, `${name}.avif`));
        const webp = await img.clone().webp({ quality: 70, effort: 6 }).toFile(join(outDir, `${name}.webp`));
        sizes.push(`${w} w ${(avif.size / 1024).toFixed(0)}/${(webp.size / 1024).toFixed(0)} KB`);
      }
      console.log(`images: ${slug}/${shot.name}  (avif/webp: ${sizes.join(", ")})`);
    }
  }
} finally {
  await browser.close();
  server.close();
}
