import type { Config } from "@react-router/dev/config";
import { existsSync } from "node:fs";
import { readdir, readFile, rename, rm, rmdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { projectImageFiles } from "./app/lib/case-study";
import { projectPath } from "./app/i18n/locale";
import { buildRobots, buildSitemap } from "./app/i18n/seo";
import { ui } from "./app/i18n/strings";
import { cardTextureSrc, loadProjects } from "./app/lib/projects";
import { site } from "./app/site.config";

/**
 * The prerendered pages preload their JavaScript at low priority. The page paints from its HTML, its stylesheet
 * and the orb poster; hydration can wait for them. At the default (High) priority the scripts compete with the
 * poster for the first bytes on a slow connection, and Lighthouse counts them as render-blocking.
 */
async function lowerModulePreloads(clientDir: string): Promise<void> {
  for (const entry of await readdir(clientDir, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".html")) continue;
    const file = join(entry.parentPath, entry.name);
    const html = await readFile(file, "utf8");
    const next = html.replace(/<link rel="modulepreload"(?![^>]*fetchpriority)/g, '<link rel="modulepreload" fetchpriority="low"');
    if (next !== html) await writeFile(file, next);
  }
}

/**
 * Emits every prerendered page as a flat `<path>.html` file (`projets/x/index.html` becomes `projets/x.html`), except the home
 * page. Cloudflare Pages serves `<path>.html` at `/<path>` with a 200 and redirects `/<path>/` to it, but it serves
 * `<path>/index.html` at `/<path>/` and redirects `/<path>` to the slash form with a 308. Every URL the site links to
 * and puts in its canonical tags is slashless, so only the flat form answers them without a redirect. Generic: any
 * route the build prerenders is flattened, whatever its path (`/en`, `/en/projects/x`, `/projets/x`).
 */
async function flattenPageFolders(clientDir: string): Promise<void> {
  const folders: string[] = [];
  for (const entry of await readdir(clientDir, { recursive: true, withFileTypes: true })) {
    if (entry.isFile() && entry.name === "index.html" && entry.parentPath !== clientDir) folders.push(entry.parentPath);
  }
  for (const folder of folders) {
    await rename(join(folder, "index.html"), `${folder}.html`);
    await rmdir(folder).catch(() => {}); // stays when it also holds other files, as /en does with /en/projects/*
  }
}

/**
 * The 404 pages, which static hosts serve with a 404 status for any path they have no file for (Cloudflare:
 * `not_found_handling: "404-page"`, which takes the nearest `404.html` up the path). Two of them:
 * - `404.html`, French, for every path outside /en: the SPA fallback, whose HTML is the 404 page (root.tsx,
 *   HydrateFallback);
 * - `en/404.html`, English, for /en/*: the prerendered `/en/404` route.
 * Both are written without their scripts: a page that only links home needs none, and the router started on an
 * unknown path would look for data no build wrote. Inside the app, a link to an unknown project gets the same page
 * from the router. Each is checked to really be the 404 page of its language (heading, noindex, `lang`).
 */
async function writeNotFoundPages(clientDir: string): Promise<void> {
  const strip = (html: string) =>
    html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, "").replace(/<link rel="modulepreload"[^>]*>/g, "");
  const pages = [
    { source: "__spa-fallback.html", target: "404.html", lang: "fr" as const },
    { source: join("en", "404", "index.html"), target: join("en", "404.html"), lang: "en" as const },
  ];
  for (const { source, target, lang } of pages) {
    const html = strip(await readFile(join(clientDir, source), "utf8"));
    const heading = ui[lang].notFound.title;
    const markers = [
      new RegExp(`<h1[^>]*>${heading}</h1>`),
      /<meta name="robots" content="noindex"\/?>/,
      new RegExp(`<html[^>]*lang="${lang}"`),
    ];
    if (!markers.every((m) => m.test(html))) {
      throw new Error(`${target}: ${source} is not the ${lang} 404 page (no "${heading}" heading, noindex or lang="${lang}")`);
    }
    await writeFile(join(clientDir, target), html);
  }
  await rm(join(clientDir, "en", "404"), { recursive: true, force: true }); // the route's folder; en/404.html replaces it
}

/** `sitemap.xml` (every page in both languages) and `robots.txt` pointing at it, written from the same project list. */
async function writeSitemapAndRobots(clientDir: string): Promise<void> {
  const slugs = loadProjects().map((p) => p.slug);
  await writeFile(join(clientDir, "sitemap.xml"), buildSitemap(site.origin, slugs));
  await writeFile(join(clientDir, "robots.txt"), buildRobots(site.origin));
}

/**
 * Every image a page or the 3D scene asks for is in the build: each cover, its phone crop and each section image, in
 * every format and width, and each card texture. A missing or renamed file fails the build instead of a page.
 */
function checkProjectImages(clientDir: string): void {
  const missing = loadProjects().flatMap((p) => {
    const card = cardTextureSrc(p.cover);
    const files = [...projectImageFiles(p).map((v) => v.src), card, card.replace(/\.avif$/, ".webp")];
    return files.filter((src) => !existsSync(join(clientDir, src))).map((src) => `${p.slug}: ${src}`);
  });
  if (missing.length > 0) {
    throw new Error(`Project images missing from the build (npm run images, npm run card-textures):\n  ${missing.join("\n  ")}`);
  }
}

export default {
  ssr: false,
  // The static routes (/, /en and the English 404 page), and both languages' case study for each project in content/projects.
  async prerender({ getStaticPaths }) {
    return [
      ...getStaticPaths(),
      ...loadProjects().flatMap((p) => [projectPath("fr", p.slug), projectPath("en", p.slug)]),
    ];
  },
  async buildEnd({ reactRouterConfig }) {
    const clientDir = join(reactRouterConfig.buildDirectory, "client");
    checkProjectImages(clientDir);
    await writeNotFoundPages(clientDir);
    await writeSitemapAndRobots(clientDir);
    await flattenPageFolders(clientDir);
    await rm(join(clientDir, "__spa-fallback.html"), { force: true }); // 404.html is its static copy; it is not a page
    await lowerModulePreloads(clientDir);
  },
} satisfies Config;
