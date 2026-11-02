// Writes the Open Graph images (Ruling R42: JPEG, 1200 x 630):
//   public/og-fr.jpg, public/og-en.jpg      the home page, per language, from scripts/mockups/og-home.html
//   public/projects/<slug>/og.jpg           each project, cropped from its cover
// Run after `npm run images`:  npm run og
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import matter from "gray-matter";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const W = 1200;
const H = 630;
const jpeg = { quality: 86, mozjpeg: true };

// Where the 1200 x 630 window sits on each project's cover (scaled to 1200 w, 900 h), as the y of its top edge.
// The default centres the device mock-ups; phone-led covers sit lower.
const OFFSET: Record<string, number> = {};
const DEFAULT_OFFSET = 125;

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript",
  ".woff2": "font/woff2",
  ".avif": "image/avif",
};
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
const origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  for (const lang of ["fr", "en"]) {
    await page.goto(`${origin}/scripts/mockups/og-home.html#${lang}`, { waitUntil: "networkidle" });
    await page.reload({ waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    const png = await page.locator("#og").screenshot();
    await sharp(png).jpeg(jpeg).toFile(join(root, "public", `og-${lang}.jpg`));
    console.log(`og: public/og-${lang}.jpg`);
  }

  // The projects whose screens are illustrative mock-ups: their share image carries a small bilingual label (the image
  // is shared by both languages), as the page does with its caption.
  const illustrative = new Set(
    readdirSync(join(root, "content", "projects", "en"))
      .map((file) => matter(readFileSync(join(root, "content", "projects", "en", file), "utf8")).data)
      .filter((d) => d.illustrative === true)
      .map((d) => String(d.slug)),
  );
  const projects = join(root, "public", "projects");
  for (const slug of readdirSync(projects)) {
    const cover = join(projects, slug, "cover.webp");
    if (!existsSync(cover)) continue;
    let image: Buffer = await sharp(cover)
      .resize(W) // 1600 x 1200 cover -> 1200 x 900
      .extract({ left: 0, top: OFFSET[slug] ?? DEFAULT_OFFSET, width: W, height: H })
      .png()
      .toBuffer();
    if (illustrative.has(slug)) {
      await page.goto(`${origin}/scripts/mockups/og-label.html`, { waitUntil: "networkidle" });
      await page.evaluate(
        ([src]) => ((document.getElementById("bg") as HTMLImageElement).src = src),
        [`data:image/png;base64,${image.toString("base64")}`],
      );
      await page.evaluate(() => document.fonts.ready);
      image = await page.locator("#og").screenshot();
    }
    await sharp(image).jpeg(jpeg).toFile(join(projects, slug, "og.jpg"));
    console.log(`og: public/projects/${slug}/og.jpg${illustrative.has(slug) ? " (labelled)" : ""}`);
  }
} finally {
  await browser.close();
  server.close();
}
