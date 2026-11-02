// Dev-only static server for build/client that compresses like Cloudflare Pages, for Lighthouse runs that match
// production. Never shipped (scripts/ is not built).
//
//   npm run build && node scripts/serve-compressed.mjs [--port 4181] [--encoding br|gzip|identity] [--dir build/client]
//                                                      [--h2]
//
// - Text responses (HTML, JS, CSS, JSON, SVG, the .data file) are brotli-compressed when the browser accepts it,
//   else gzipped; images and fonts are already compressed and go as they are (Cloudflare does the same).
// - Headers as Cloudflare's static hosting sends them: content-type, ETag, `Cache-Control: public, max-age=0,
//   must-revalidate`, `Vary: Accept-Encoding`. Conditional requests get 304. No security headers are added by default.
// - The build's `_headers` file (public/_headers) applies on top, as Cloudflare applies it: its headers replace the
//   defaults of the same name (the fingerprinted /assets/* are cached for a year; `/*` carries the security headers).
//   Like `_redirects`, it is not served.
// - Routing is Cloudflare Pages': `/x` serves `x.html` with a 200 (the build emits flat `<path>.html` pages), `/x/` and
//   `/x.html` redirect (308) to `/x`, `/dir/` serves `dir/index.html`, and `/` serves `index.html`. Unknown paths get
//   the nearest `404.html` (`/en/x` gets `en/404.html`, other paths the root one) with a 404 status; the `_headers` rules apply to it as to any response (Pages does the same).
// `--encoding` caps what is offered: `gzip` never sends brotli, `identity` sends nothing compressed.
// `--dir` serves another build (relative to the project root), e.g. an older one for a before/after comparison.
// `--h2` serves HTTP/2 over TLS, as Cloudflare does, with a throwaway self-signed certificate made by openssl
// (browsers need --ignore-certificate-errors). Without it the server speaks plain HTTP/1.1.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { createSecureServer } from "node:http2";
import { tmpdir } from "node:os";
import { dirname, extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { brotliCompressSync, constants, gzipSync } from "node:zlib";

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
};
const port = Number(arg("--port", 4181));
const maxEncoding = arg("--encoding", "br");
if (!["br", "gzip", "identity"].includes(maxEncoding)) throw new Error(`serve-compressed: unknown --encoding ${maxEncoding}`);

const root = resolve(join(dirname(fileURLToPath(import.meta.url)), ".."), arg("--dir", "build/client"));
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript",
  ".mjs": "application/javascript",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".data": "text/x-script",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".ico": "image/x-icon",
  ".avif": "image/avif",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".woff2": "font/woff2",
};
const COMPRESSIBLE = new Set([".html", ".js", ".mjs", ".css", ".json", ".data", ".svg", ".txt", ".ico"]);
const PAGES_HEADERS = {
  "cache-control": "public, max-age=0, must-revalidate",
};

/** Each file read and compressed once; all of them before the server listens (see below), as a CDN serves from cache. */
const cache = new Map();
function load(file) {
  let entry = cache.get(file);
  if (entry) return entry;
  const raw = readFileSync(file);
  const ext = extname(file);
  const compressible = COMPRESSIBLE.has(ext);
  entry = {
    type: TYPES[ext] ?? "application/octet-stream",
    etag: `"${createHash("sha1").update(raw).digest("hex").slice(0, 20)}"`,
    identity: raw,
    br: compressible
      ? brotliCompressSync(raw, { params: { [constants.BROTLI_PARAM_QUALITY]: 11, [constants.BROTLI_PARAM_SIZE_HINT]: raw.length } })
      : null,
    gzip: compressible ? gzipSync(raw, { level: 9 }) : null,
  };
  cache.set(file, entry);
  return entry;
}

const isFile = (f) => existsSync(f) && statSync(f).isFile();

/**
 * Cloudflare Pages' routing of a request path (as seen with `wrangler pages dev`, which emulates it):
 * - `/x` serves `x` if that is a file, else `x.html`; `/x` with only `x/index.html` redirects (308) to `/x/`;
 * - `/x/` serves `x/index.html`, or redirects to `/x` when only `x.html` exists;
 * - `/x.html` and `/x/index.html` redirect to `/x` and `/x/`;
 * - anything else is the 404 page.
 * Returns { file }, { redirect }, { file: null } for not found, or undefined when the path is not valid percent-encoding.
 * The build emits flat `<path>.html` pages (react-router.config.ts) so that the slashless URLs answer 200.
 */
function route(pathname) {
  let p;
  try {
    p = decodeURIComponent(pathname);
  } catch {
    return undefined;
  }
  const rel = p.slice(1);
  const abs = (r) => {
    const f = normalize(join(root, r));
    return f.startsWith(root + sep) || f === root ? f : null;
  };
  const exists = (r) => abs(r) !== null && isFile(abs(r));
  const found = (r) => ({ file: abs(r) });
  const missing = { file: null };
  if (CONFIG_FILES.has(rel)) return missing;
  if (p === "/index.html" || p.endsWith("/index.html")) return exists(rel) ? { redirect: p.slice(0, -"index.html".length) } : missing;
  if (p.endsWith(".html")) return exists(rel) ? { redirect: p.slice(0, -".html".length) } : missing;
  if (p.endsWith("/")) {
    if (exists(rel + "index.html")) return found(rel + "index.html");
    if (p !== "/" && exists(rel.slice(0, -1) + ".html")) return { redirect: p.slice(0, -1) };
    return missing;
  }
  if (exists(rel)) return found(rel);
  if (exists(rel + ".html")) return found(rel + ".html");
  if (exists(rel + "/index.html")) return { redirect: p + "/" };
  return missing;
}

/**
 * The 404 page for a path: the nearest `404.html` up the path, as Cloudflare Pages picks it (`/en/nope` gets
 * `en/404.html`, a path outside /en the root `404.html`). Null when the build has none.
 */
function notFoundFor(pathname) {
  const parts = pathname.split("/").filter(Boolean);
  for (let n = parts.length - 1; n >= 0; n--) {
    const candidate = abs404(parts.slice(0, n).concat("404.html").join("/"));
    if (candidate) return candidate;
  }
  return null;
}
const abs404 = (rel) => {
  const f = normalize(join(root, rel));
  return f.startsWith(root + sep) && isFile(f) ? f : null;
};

/** Cloudflare's configuration files in the output directory: read by the host, never served. */
const CONFIG_FILES = new Set(["_headers", "_redirects"]);

/**
 * The rules of a `_headers` file: a URL pattern on its own line (`*` matches anything, here as on Cloudflare), then
 * its headers on indented `Name: value` lines; `#` starts a comment.
 */
function headerRules(file) {
  if (!existsSync(file)) return [];
  const rules = [];
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const text = line.trim();
    if (!text || text.startsWith("#")) continue;
    if (/^\s/.test(line)) {
      const header = text.match(/^([^:]+):\s*(.*)$/);
      if (!header || rules.length === 0) throw new Error(`serve-compressed: bad _headers line "${line}"`);
      rules.at(-1).headers[header[1].trim().toLowerCase()] = header[2];
    } else {
      const pattern = text.split("*").map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join(".*");
      rules.push({ pattern: new RegExp(`^${pattern}$`), headers: {} });
    }
  }
  return rules;
}
const customHeaders = headerRules(join(root, "_headers"));
/** The `_headers` headers for a request path; a later rule wins over an earlier one. */
const headersFor = (pathname) =>
  Object.assign({}, ...customHeaders.filter((rule) => rule.pattern.test(pathname)).map((rule) => rule.headers));

function pickEncoding(accept, entry) {
  if (!entry.br) return "identity";
  const offered = (accept ?? "").split(",").map((s) => s.trim().split(";")[0]);
  if (maxEncoding === "br" && offered.includes("br")) return "br";
  if (maxEncoding !== "identity" && offered.includes("gzip")) return "gzip";
  return "identity";
}

/**
 * A self-signed certificate for 127.0.0.1, made by openssl in a temp directory that is removed as soon as the
 * files are read: the server may be stopped by a kill that runs no exit handlers (as on Windows).
 */
function selfSigned() {
  const dir = mkdtempSync(join(tmpdir(), "serve-compressed-"));
  try {
    const key = join(dir, "key.pem");
    const cert = join(dir, "cert.pem");
    execFileSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-days", "2", "-subj", "/CN=127.0.0.1",
      "-addext", "subjectAltName=IP:127.0.0.1", "-keyout", key, "-out", cert], { stdio: "ignore", env: { ...process.env, MSYS_NO_PATHCONV: "1" } });
    return { key: readFileSync(key), cert: readFileSync(cert) };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const handler = (req, res) => {
  const { pathname, search } = new URL(req.url ?? "/", "http://localhost");
  const routed = route(pathname);
  if (routed === undefined) {
    res.writeHead(400, { "content-type": "text/plain; charset=utf-8", ...PAGES_HEADERS });
    res.end("Bad request");
    return;
  }
  if (routed.redirect !== undefined) {
    res.writeHead(308, { location: routed.redirect + search, "cache-control": "no-store" });
    res.end();
    return;
  }
  const file = routed.file;
  const notFoundPage = file ? null : notFoundFor(pathname);
  if (!file && !notFoundPage) {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8", ...PAGES_HEADERS });
    res.end("Not found");
    return;
  }
  const status = file ? 200 : 404;
  const entry = load(file ?? notFoundPage);
  const encoding = pickEncoding(req.headers["accept-encoding"], entry);
  const headers = { "content-type": entry.type, etag: entry.etag, vary: "Accept-Encoding", ...PAGES_HEADERS, ...headersFor(pathname) };
  if (status === 404) headers["cache-control"] = "no-store";
  if (status === 200 && req.headers["if-none-match"] === entry.etag) {
    res.writeHead(304, headers);
    res.end();
    return;
  }
  const body = entry[encoding];
  if (encoding !== "identity") headers["content-encoding"] = encoding;
  headers["content-length"] = String(body.length);
  res.writeHead(status, headers);
  res.end(req.method === "HEAD" ? undefined : body);
};
const h2 = args.includes("--h2");
const server = h2 ? createSecureServer({ ...selfSigned(), allowHTTP1: true }, handler) : createServer(handler);

// Brotli at quality 11 takes hundreds of milliseconds on the largest chunks; doing it on a first request would
// make that response look slow to Lighthouse, which estimates server latency from what it observes.
for (const entry of readdirSync(root, { recursive: true, withFileTypes: true })) {
  if (entry.isFile()) load(join(entry.parentPath, entry.name));
}

server.listen(port, "127.0.0.1", () => {
  console.log(`serve-compressed: ${root} on ${h2 ? "https" : "http"}://127.0.0.1:${port}/ (${h2 ? "HTTP/2" : "HTTP/1.1"}, up to ${maxEncoding}), pid ${process.pid}`);
});
