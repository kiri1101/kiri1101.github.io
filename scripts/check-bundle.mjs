// First-route JavaScript budget and the 3D boundary, checked on the prerendered build.
//
// Initial JS = every module index.html runs up front: <script type="module" src>, <link rel="modulepreload">,
// and the imports of inline module scripts (their import() of the entry runs at once too), plus everything
// those chunks import statically. It must stay within the budget and contain no three.js code.
// The 3D chunk must exist and be reached only lazily: through a dynamic import() or a worker's script (and what
// those load in turn). A worker's own script must not contain three.js either: it checks the hardware first.
// three.js is recognised by its code, not by file names, so hashed names cannot cause false alarms.
// Every case-study page (projets/<slug>.html, en/projects/<slug>.html) is checked as a first route too: the same budget, and no three.js or
// scene host code at all.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, posix, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const LIMIT_BYTES = 150 * 1024;
const THREE_SIGNATURE = /__THREE__|THREE\.WebGLRenderer/;
const clientDir = join(dirname(fileURLToPath(import.meta.url)), "..", "build", "client");
const html = readFileSync(join(clientDir, "index.html"), "utf8");

const STATIC_IMPORT = /\b(?:import|export)\s*(?:[^"'`;()]*?\bfrom\s*)?(["'`])([^"'`\s]+?\.js)\1/g;
const DYNAMIC_IMPORT = /\bimport\s*\(\s*(["'`])([^"'`\s]+?\.js)\1\s*\)/g;
/** Vite's `new Worker(new URL("…", import.meta.url))`: a worker's script, loaded when the page starts it. */
const WORKER_URL = /\bnew\s+Worker\s*\(\s*new\s+URL\s*\(\s*(["'`])([^"'`\s]+?\.js)\1/g;

/** Resolves an import specifier to a path inside build/client, or null if it is not a built file. */
function resolve(specifier, fromFile) {
  const clean = specifier.split(/[?#]/)[0];
  let path;
  if (clean.startsWith("/")) path = clean.slice(1);
  else if (clean.startsWith("./") || clean.startsWith("../")) path = posix.join(posix.dirname(fromFile), clean);
  else return null;
  return existsSync(join(clientDir, path)) ? path : null;
}

const specifiers = (code, pattern) => [...code.matchAll(pattern)].map((m) => m[2]);
const read = (path) => readFileSync(join(clientDir, path), "utf8");
const gzipKb = (path) => gzipSync(readFileSync(join(clientDir, path))).length / 1024;

// ---------- entry points from the HTML ----------
/** The modules a prerendered page runs up front (its URLs are absolute, so any page resolves the same way). */
function entryRoots(pageHtml) {
  const found = new Set();
  for (const tag of pageHtml.match(/<(?:script|link)\b[^>]*>/g) ?? []) {
    const isModuleScript = /^<script\b/.test(tag) && /\btype=["']module["']/.test(tag);
    const isPreload = /^<link\b/.test(tag) && /\brel=["']modulepreload["']/.test(tag);
    if (!isModuleScript && !isPreload) continue;
    const url = tag.match(/\b(?:src|href)=["']([^"']+)["']/)?.[1];
    const path = url && resolve(url, "index.html");
    if (path) found.add(path);
  }
  for (const [, code] of pageHtml.matchAll(/<script\b[^>]*\btype=["']module["'][^>]*>([\s\S]*?)<\/script>/g)) {
    for (const s of [...specifiers(code, STATIC_IMPORT), ...specifiers(code, DYNAMIC_IMPORT)]) {
      const path = resolve(s, "index.html");
      if (path) found.add(path);
    }
  }
  return found;
}

const roots = entryRoots(html);
if (roots.size === 0) {
  console.error("check:bundle: no module scripts found in build/client/index.html");
  process.exit(1);
}

// ---------- initial closure (static imports) and lazy chunks (dynamic imports) ----------
function staticClosure(start) {
  const seen = new Set();
  const queue = [...start];
  while (queue.length > 0) {
    const file = queue.pop();
    if (seen.has(file)) continue;
    seen.add(file);
    for (const s of specifiers(read(file), STATIC_IMPORT)) {
      const path = resolve(s, file);
      if (path && !seen.has(path)) queue.push(path);
    }
  }
  return seen;
}

const initial = staticClosure(roots);

// Lazy code: what a dynamic import() or a worker's script reaches from the initial code, and in turn from that
// code (the scene worker imports its three.js chunk dynamically, once its hardware check passes).
const workers = new Set();
const lazySet = new Set();
let frontier = [...initial];
while (frontier.length > 0) {
  const next = [];
  for (const file of frontier) {
    const code = read(file);
    const targets = [
      ...specifiers(code, DYNAMIC_IMPORT).map((s) => ({ s, worker: false })),
      ...specifiers(code, WORKER_URL).map((s) => ({ s, worker: true })),
    ];
    for (const { s, worker } of targets) {
      const path = resolve(s, file);
      if (!path || initial.has(path)) continue;
      if (worker) workers.add(path);
      for (const reached of staticClosure([path])) {
        if (initial.has(reached) || lazySet.has(reached)) continue;
        lazySet.add(reached);
        next.push(reached);
      }
    }
  }
  frontier = next;
}
const lazy = [...lazySet];

// ---------- report ----------
const failures = [];
let total = 0;
console.log("Initial JS (index.html):");
for (const file of [...initial].sort()) {
  const kb = gzipKb(file);
  total += kb;
  const hasThree = THREE_SIGNATURE.test(read(file));
  if (hasThree) failures.push(`three.js code in an initial chunk: ${file}`);
  console.log(`${kb.toFixed(1).padStart(7)} KB gzip  ${file}${hasThree ? "  <- three.js" : ""}`);
}
console.log(`First-route JS: ${total.toFixed(1)} KB gzip (limit ${LIMIT_BYTES / 1024} KB)`);
if (total * 1024 > LIMIT_BYTES) failures.push("first-route JavaScript exceeds the budget");
if (THREE_SIGNATURE.test(html)) failures.push("three.js code inlined in index.html");

const threeChunks = lazy.filter((f) => THREE_SIGNATURE.test(read(f)));
console.log("Lazy chunks (loaded through import() or as a worker):");
for (const file of lazy.sort()) {
  const tags = [workers.has(file) && "worker", threeChunks.includes(file) && "three.js (3D scene)"].filter(Boolean);
  console.log(`${gzipKb(file).toFixed(1).padStart(7)} KB gzip  ${file}${tags.length ? `  <- ${tags.join(", ")}` : ""}`);
}
if (threeChunks.length === 0) failures.push("no lazily imported chunk contains three.js: the 3D scene chunk is missing");
// The scene renders from a worker: if none is found, the page lost it, or this check no longer recognises how the
// build starts it, and either way the result above would mean less than it says.
if (workers.size === 0) failures.push("no scene worker found (new Worker(new URL(…)) in the initial or lazy code)");
// A worker's own script runs its hardware check before it downloads three.js, so three.js stays out of it, and the
// scene chunk it loads afterwards must be among what it reaches.
for (const worker of workers) {
  for (const file of staticClosure([worker])) {
    if (THREE_SIGNATURE.test(read(file))) failures.push(`three.js code in worker ${worker}'s entry: ${file}`);
  }
  const reached = new Set([worker]);
  for (let queue = [worker]; queue.length > 0; ) {
    const file = queue.pop();
    for (const s of [...specifiers(read(file), STATIC_IMPORT), ...specifiers(read(file), DYNAMIC_IMPORT)]) {
      const path = resolve(s, file);
      if (path && !reached.has(path)) {
        reached.add(path);
        queue.push(path);
      }
    }
  }
  if (![...reached].some((f) => THREE_SIGNATURE.test(read(f)))) failures.push(`worker ${worker} reaches no three.js chunk`);
}

// ---------- the case-study pages ----------
// Each case-study page (/projets/<slug>, /en/projects/<slug>) is a first route too: the same budget, and neither three.js nor the scene host (the code
// that starts the scene worker or hands it a canvas), which belong to the home page alone.
const SCENE_HOST_SIGNATURE = /transferControlToOffscreen|\bnew\s+Worker\s*\(/;
// Pages are emitted flat (react-router.config.ts, flattenPageFolders): <path>.html, not <path>/index.html.
// The home pages (index.html, and en.html, which is the same page in English) and the script-free 404 pages are not.
const NOT_CASE_PAGES = new Set(["index.html", "en.html", "404.html", "en/404.html", "__spa-fallback.html"]);
const casePages = readdirSync(clientDir, { recursive: true, withFileTypes: true })
  .filter((d) => d.isFile() && d.name.endsWith(".html"))
  .map((d) => relative(clientDir, join(d.parentPath, d.name)).split(sep).join("/"))
  .filter((page) => !NOT_CASE_PAGES.has(page));
if (casePages.length === 0) failures.push("no prerendered case-study pages in build/client");
let largest = 0;
for (const page of casePages) {
  const closure = staticClosure(entryRoots(read(page)));
  if (closure.size === 0) failures.push(`${page}: no module scripts found`);
  const kb = [...closure].reduce((sum, file) => sum + gzipKb(file), 0);
  largest = Math.max(largest, kb);
  if (kb * 1024 > LIMIT_BYTES) failures.push(`${page}: first-route JavaScript exceeds the budget (${kb.toFixed(1)} KB)`);
  for (const file of closure) {
    const code = read(file);
    if (THREE_SIGNATURE.test(code)) failures.push(`${page}: three.js code in ${file}`);
    if (SCENE_HOST_SIGNATURE.test(code)) failures.push(`${page}: scene host code in ${file}`);
  }
}
console.log(
  `Case-study pages: ${casePages.length}, largest initial JS ${largest.toFixed(1)} KB gzip, no three.js or scene host allowed`,
);

// The English home page (en.html) is the home page again: it carries the scene host, so it is held to the same budget as
// index.html (checked above), not to the case-study rule.
{
  const english = staticClosure(entryRoots(read("en.html")));
  const kb = [...english].reduce((sum, file) => sum + gzipKb(file), 0);
  if (english.size === 0) failures.push("en.html: no module scripts found");
  if (kb * 1024 > LIMIT_BYTES) failures.push(`en.html: first-route JavaScript exceeds the budget (${kb.toFixed(1)} KB)`);
  console.log(`English home (en.html): initial JS ${kb.toFixed(1)} KB gzip`);
}

if (failures.length > 0) {
  for (const f of failures) console.error(`FAIL: ${f}`);
  process.exit(1);
}
console.log("OK");
