import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import matter from "gray-matter";
import { ui, type Strings } from "../../app/i18n/strings";
import { siteIn } from "../../app/site.config";

const ORIGIN = "https://jordan-tukum.pages.dev";
const contentDir = (l: string) => join(process.cwd(), "content", "projects", l);
const mdFiles = (l: string) => readdirSync(contentDir(l)).filter((f) => f.endsWith(".md")).sort();
const slugs = mdFiles("fr").map((f) => String(matter(readFileSync(join(contentDir("fr"), f), "utf8")).data.slug));

type Lang = "fr" | "en";
const OTHER: Record<Lang, Lang> = { fr: "en", en: "fr" };
const OG: Record<Lang, string> = { fr: "fr_FR", en: "en_US" };
const home = (l: Lang) => (l === "fr" ? "/" : "/en");
const project = (l: Lang, slug: string) => (l === "fr" ? `/projets/${slug}` : `/en/projects/${slug}`);

const pages = (l: Lang) => [home(l), ...slugs.map((s) => project(l, s))];
const counterpart = (path: string, l: Lang) =>
  path === home(l) ? home(OTHER[l]) : project(OTHER[l], path.split("/").at(-1)!);

const attr = (tag: string, name: string) => tag.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1];
const tags = (html: string, re: RegExp) => html.match(re) ?? [];

test.describe("every route, in both languages", () => {
  for (const lang of ["fr", "en"] as const) {
    for (const path of pages(lang)) {
      test(`${path}: 200, lang="${lang}", canonical, hreflang and og:locale`, async ({ request }) => {
        const res = await request.get(path, { maxRedirects: 0 });
        expect(res.status()).toBe(200);
        const html = await res.text();
        expect(html).toContain(`<html lang="${lang}"`);

        const canonical = tags(html, /<link[^>]*rel="canonical"[^>]*>/g).map((t) => attr(t, "href"));
        expect(canonical).toEqual([ORIGIN + path]);

        const alternates = Object.fromEntries(
          tags(html, /<link[^>]*rel="alternate"[^>]*hrefLang="[^"]*"[^>]*>/g).map((t) => [attr(t, "hrefLang"), attr(t, "href")]),
        );
        expect(alternates).toEqual({
          fr: ORIGIN + (lang === "fr" ? path : counterpart(path, lang)),
          en: ORIGIN + (lang === "en" ? path : counterpart(path, lang)),
          "x-default": ORIGIN + (lang === "fr" ? path : counterpart(path, lang)),
        });

        expect(html).toContain(`<meta property="og:locale" content="${OG[lang]}"/>`);
        expect(html).toContain(`<meta property="og:locale:alternate" content="${OG[OTHER[lang]]}"/>`);
      });
    }
  }
});

test("the sitemap lists every page in both languages, each answering 200, and robots.txt points at it", async ({ request }) => {
  const xml = await (await request.get("/sitemap.xml")).text();
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  expect(locs.sort()).toEqual([...pages("fr"), ...pages("en")].map((p) => ORIGIN + p).sort());
  for (const loc of locs) expect((await request.get(new URL(loc).pathname, { maxRedirects: 0 })).status(), loc).toBe(200);
  expect(await (await request.get("/robots.txt")).text()).toContain(`Sitemap: ${ORIGIN}/sitemap.xml`);
});

test.describe("the language switch", () => {
  for (const lang of ["fr", "en"] as const) {
    test(`on the ${lang} home page it lands on the ${OTHER[lang]} home page`, async ({ page }) => {
      await page.goto(home(lang));
      const link = page.locator(".site-header .lang-switch");
      await expect(link).toHaveAttribute("href", home(OTHER[lang]));
      await expect(link).toHaveAttribute("hreflang", OTHER[lang]);
      await expect(link).toHaveAccessibleName(ui[lang].lang.name);
      await link.click();
      await expect(page).toHaveURL(new RegExp(`${home(OTHER[lang])}$`));
      await expect(page.locator("html")).toHaveAttribute("lang", OTHER[lang]);
      await expect(page.locator(".site-header .lang-switch")).toHaveAttribute("href", home(lang));
    });

    test(`on a ${lang} case study it lands on the same project in ${OTHER[lang]}`, async ({ page }) => {
      const slug = slugs[3];
      await page.goto(project(lang, slug));
      await page.locator(".cs-nav .lang-switch").click();
      await expect(page).toHaveURL(new RegExp(`${project(OTHER[lang], slug)}$`));
      await expect(page.locator("html")).toHaveAttribute("lang", OTHER[lang]);
      await expect(page.locator("h1")).not.toBeEmpty();
      await expect(page.locator(".cs-nav .lang-switch")).toHaveAttribute("href", project(lang, slug));
    });
  }
});

test.describe("404 pages", () => {
  const cases: { lang: Lang; path: string }[] = [
    { lang: "fr", path: "/pas-une-page" },
    { lang: "fr", path: "/projets/does-not-exist" },
    { lang: "en", path: "/en/nope" },
    { lang: "en", path: "/en/projects/does-not-exist" },
  ];
  for (const { lang, path } of cases) {
    test(`${path} is the ${lang} 404 page, with a 404 status`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res!.status()).toBe(404);
      await expect(page.locator("html")).toHaveAttribute("lang", lang);
      await expect(page.locator("h1")).toHaveText(ui[lang].notFound.title);
      await expect(page).toHaveTitle(new RegExp(`^${ui[lang].notFound.title} — `));
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex");
      await expect(page.getByRole("link", { name: ui[lang].study.back })).toHaveAttribute("href", home(lang));
      // The page has no counterpart: its switch goes to the other language's home page.
      await expect(page.locator(".cs-nav .lang-switch")).toHaveAttribute("href", home(OTHER[lang]));
    });
  }
});

// ---------- no chrome from the other language ----------

/** The fixed phrases of a dictionary: every string, and every string a function builds around its arguments. */
function phrases(dict: Strings): string[] {
  const out: string[] = [];
  const walk = (v: unknown) => {
    if (typeof v === "string") out.push(v);
    else if (typeof v === "function") (v as (...a: unknown[]) => string)("\u0001", "\u0001").split("\u0001").forEach((p) => out.push(p));
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  walk(dict);
  return out.map((p) => p.replace(/^[\s.,:;() ©·-]+|[\s.,:;() ©·-]+$/g, "")).filter((p) => p.length >= 4);
}

/** Phrases the other language's dictionary has and this one does not: seeing one on a page is a mixed-language page. */
function foreign(lang: Lang): string[] {
  const own = new Set(phrases(ui[lang]));
  return [...new Set(phrases(ui[OTHER[lang]]))].filter((p) => !own.has(p));
}

/** Whether `phrase` is in `text` as whole words ("Orbit" is not in "Orbite"). */
const has = (text: string, phrase: string) =>
  new RegExp(String.raw`(?<![\p{L}\p{N}])${phrase.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)}(?![\p{L}\p{N}])`, "u").test(text);

/** The page's text and the text of its labels, minus the owner's content (Task J3 brings the real bilingual one). */
async function chromeText(page: Page): Promise<string> {
  return page.evaluate(() => {
    const body = document.body.cloneNode(true) as HTMLElement;
    const content = [
      "script", "style", "noscript", ".hero-left", ".hero-right", "#outro", ".stmt", ".principles", ".exp", ".facts dd", ".portrait",
      ".cs-intro", ".cs-story", ".cs-shot", ".cs-next-title", "#title", "#cat", "#project-list a", ".direct-email a", ".socials",
    ];
    body.querySelectorAll(content.join(",")).forEach((e) => e.remove());
    const labels = [...document.querySelectorAll("[aria-label],[placeholder],[title]")].flatMap((e) =>
      ["aria-label", "placeholder", "title"].map((a) => e.getAttribute(a) ?? ""),
    );
    return [body.textContent ?? "", ...labels].join("\n");
  });
}

test.describe("no chrome string from the other language", () => {
  const cases = (lang: Lang) => [
    { name: "home", path: home(lang) },
    { name: "case study", path: project(lang, slugs[0]) },
    { name: "404", path: lang === "fr" ? "/pas-une-page" : "/en/nope" },
  ];
  for (const lang of ["fr", "en"] as const) {
    for (const { name, path } of cases(lang)) {
      test(`${lang} ${name}: nothing from the ${OTHER[lang]} dictionary`, async ({ page }) => {
        await page.goto(path);
        const text = await chromeText(page);
        const hits = foreign(lang).filter((p) => has(text, p));
        expect(hits).toEqual([]);
        // And the page does speak its own language: a few of its own phrases are there.
        const own = phrases(ui[lang]).filter((p) => has(text, p));
        expect(own.length).toBeGreaterThanOrEqual(2);
      });
    }
  }
});

// ---------- no content from the other language ----------

/** Every string of a value, whatever its depth (functions are computed values, not text). */
function strings(v: unknown, out: string[] = []): string[] {
  if (typeof v === "string") out.push(v);
  else if (v && typeof v === "object") Object.values(v).forEach((x) => strings(x, out));
  return out;
}

/** What the content of a page says in `lang`: the site’s copy plus a project’s fields and paragraphs, as whole strings. */
function contentPhrases(lang: Lang, slug?: string): string[] {
  const out = strings(siteIn(lang));
  if (slug) {
    const raw = readFileSync(join(contentDir(lang), `${slug}.md`), "utf8");
    const { data, content } = matter(raw);
    const { cover, sections, accent, ...rest } = data as Record<string, unknown>;
    strings(rest, out);
    strings((sections as { lead: string; caption: string }[]).map((s) => [s.lead, s.caption]), out);
    content.split(/\n\s*\n/).forEach((p) => out.push(p.trim()));
  }
  return out.map((p) => p.trim()).filter((p) => p.length >= 14 && !p.startsWith("#") && !/^https?:|^\//.test(p));
}

test.describe("no content from the other language", () => {
  for (const lang of ["fr", "en"] as const) {
    for (const slug of [undefined, ...slugs]) {
      const path = slug ? project(lang, slug) : home(lang);
      test(`${path}: none of the ${OTHER[lang]} copy`, async ({ page }) => {
        await page.goto(path);
        const text = await page.evaluate(() => {
          const body = document.body.cloneNode(true) as HTMLElement;
          body.querySelectorAll("script,style,noscript").forEach((e) => e.remove());
          return (body.textContent ?? "").replace(/\s+/g, " ");
        });
        const own = new Set([...contentPhrases(lang, slug), ...contentPhrases(lang)]);
        const foreignPhrases = [...new Set([...contentPhrases(OTHER[lang], slug), ...contentPhrases(OTHER[lang])])].filter((p) => !own.has(p));
        expect(foreignPhrases.filter((p) => text.includes(p.replace(/\s+/g, " ")))).toEqual([]);
        // And the page does carry its own copy.
        const mine = [...own].filter((p) => text.includes(p.replace(/\s+/g, " ")));
        expect(mine.length).toBeGreaterThanOrEqual(3);
      });
    }
  }
});

// ---------- the demo’s fiction is gone from the build ----------

test("the build output holds none of the fictional demo or the bid’s client", () => {
  const root = join(process.cwd(), "build", "client");
  expect(existsSync(root), "run npm run build first").toBe(true);
  const files: string[] = [];
  const walk = (d: string) =>
    readdirSync(d).forEach((n) => {
      const p = join(d, n);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(html|js|css|json|xml|txt|svg|md)$/.test(n)) files.push(p);
    });
  walk(root);
  expect(files.length).toBeGreaterThan(20);
  // The bid's client name is guarded by hash, so the word itself is in no file: every word token of the output is
  // hashed (SHA-256, lower case) and compared with this list.
  const bannedHashes = new Set(["fce1cd61bd52bbc655a3327bb8e253fb6a8aad71fddca88d634a9b99849ca66f"]);
  const banned = [/Lena Moreau/i, /lenamoreau/i, /\.example\b/i];
  const hashed = new Map<string, boolean>();
  const bannedToken = (t: string) => {
    let v = hashed.get(t);
    if (v === undefined) hashed.set(t, (v = bannedHashes.has(createHash("sha256").update(t).digest("hex"))));
    return v;
  };
  const hits = files.flatMap((f) => {
    const text = readFileSync(f, "utf8");
    const found = banned.filter((re) => re.test(text)).map((re) => `${f.slice(root.length)}: ${re}`);
    if ((text.toLowerCase().match(/[a-z0-9]+/g) ?? []).some(bannedToken)) found.push(`${f.slice(root.length)}: banned word hash`);
    return found;
  });
  expect(hits).toEqual([]);
});
