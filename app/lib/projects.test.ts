import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { describe, expect, test } from "vitest";
import { CARD_TEXTURE } from "~/scene/types";
import { projectImageFiles } from "./case-study";
import { cardTextureSrc, collectionSummary, inWords, inWordsFr, loadProjects, parseProject, ProjectContentError, sortedUnique } from "./projects";

const publicFile = (src: string) => join(process.cwd(), "public", src);
const sha256 = (file: string) => createHash("sha256").update(readFileSync(file)).digest("hex");

const years = (...ys: number[]) => ys.map((year) => ({ year }));

describe("collection summary", () => {
  test("summary spells the count and computes the year range", () => {
    expect(collectionSummary(years(2026, 2025, 2025, 2024, 2024, 2024, 2023, 2023, 2023, 2022, 2022, 2022), "en")).toBe(
      "Twelve projects, 2022 – 2026",
    );
    expect(collectionSummary(years(2026), "en")).toBe("One project, 2026");
    expect(inWords(21)).toBe("twenty-one");
  });
  test("the French summary spells the count in French", () => {
    expect(collectionSummary(years(2026, 2022), "fr")).toBe("Deux projets, 2022 – 2026");
    expect(collectionSummary(years(2026), "fr")).toBe("Un projet, 2026");
    expect(collectionSummary([], "fr")).toBe("Aucun projet pour l’instant");
    expect(collectionSummary([], "en")).toBe("No projects yet");
  });
  test("French number words, including the irregular 70s, 80s and 90s", () => {
    const n = [1, 12, 21, 31, 70, 71, 77, 80, 81, 91, 99].map(inWordsFr);
    expect(n).toEqual(["un", "douze", "vingt et un", "trente et un", "soixante-dix", "soixante et onze", "soixante-dix-sept", "quatre-vingts", "quatre-vingt-un", "quatre-vingt-onze", "quatre-vingt-dix-neuf"]);
  });
});

describe("parseProject", () => {
  test("missing title names the file", () => {
    expect(() => parseProject("---\nslug: x\n---\n", "x.md")).toThrow(/x\.md.*title/);
    expect(() => parseProject("---\nslug: x\n---\n", "x.md")).toThrow(ProjectContentError);
  });

  // The smallest project the parser accepts; each test below breaks one thing in it.
  const base = {
    slug: "x", title: "X", year: 2024, discipline: "d", category: "c", summary: "s", role: "r", timeline: "t", team: "t",
    platforms: "p", order: 1,
    stats: [{ value: "1", label: "a" }, { value: "2", label: "b" }],
    sections: [{ image: { src: "/i.avif", width: 1, height: 1, alt: "a" }, lead: "l", caption: "c" }],
    cover: { src: "/c.avif", width: 1, height: 1, alt: "a" },
    accent: { from: "#000", to: "#fff" },
  };
  const md = (over: Record<string, unknown> = {}, file = "x.md") =>
    parseProject("---\n" + JSON.stringify({ ...base, ...over }) + "\n---\nBody", file);

  test("the smallest valid project parses", () => expect(md().slug).toBe("x"));

  test("a field of the wrong type is named", () => {
    expect(() => md({ year: "2024" })).toThrow(/x\.md.*"year"/);
    expect(() => md({ title: 7 })).toThrow(/"title"/);
  });

  test("an error inside a nested item names the item", () => {
    expect(() => md({ stats: [{ value: "1", label: "a" }, { value: "2" }] })).toThrow(/stats\[1\].*"label"/);
    expect(() => md({ sections: [{ ...base.sections[0], image: { src: "/i.avif" } }] })).toThrow(/sections\[0\].*"width"/);
  });

  test("the slug must be lower-case words and match the file name", () => {
    expect(() => md({ slug: "Bad Slug" }, "Bad Slug.md")).toThrow(/"slug".*lower-case/);
    expect(() => md({ slug: "y" })).toThrow(/"slug".*file name/);
  });

  test("at most three stats", () => {
    const four = [1, 2, 3, 4].map((n) => ({ value: String(n), label: "l" }));
    expect(() => md({ stats: four })).toThrow(/"stats".*at most 3/);
  });
});

describe("sortedUnique", () => {
  const p = (slug: string, order: number) => ({ slug, order }) as Parameters<typeof sortedUnique>[0][number];

  test("sorts by order", () => expect(sortedUnique([p("b", 2), p("a", 1)]).map((x) => x.slug)).toEqual(["a", "b"]));

  test("rejects a repeated slug or a repeated order", () => {
    expect(() => sortedUnique([p("a", 1), p("a", 2)])).toThrow(/"slug".*another/);
    expect(() => sortedUnique([p("a", 1), p("b", 1)])).toThrow(/"order".*another/);
  });
});

describe("card textures", () => {
  test("every project has its card texture beside its cover, at the scene's texture size (npm run card-textures)", async () => {
    for (const p of loadProjects()) {
      const avif = cardTextureSrc(p.cover);
      expect(avif).toBe(`/projects/${p.slug}/card.avif`);
      for (const src of [avif, avif.replace(/.avif$/, ".webp")]) {
        const file = join(process.cwd(), "public", src);
        expect(existsSync(file), src).toBe(true);
        const { width, height } = await sharp(file).metadata();
        expect({ width, height }, src).toEqual(CARD_TEXTURE);
      }
    }
  });

  // Freshness guard: `npm run card-textures` records each cover's hash beside the textures it made from it.
  test("each card texture was made from its cover as the cover is now (else: npm run card-textures)", () => {
    const lockFile = join(process.cwd(), "scripts", "card-textures.lock.json");
    expect(existsSync(lockFile), "scripts/card-textures.lock.json: run npm run card-textures").toBe(true);
    const lock = JSON.parse(readFileSync(lockFile, "utf8")) as Record<string, { cover: string; avif: string; webp: string }>;
    for (const p of loadProjects()) {
      const card = cardTextureSrc(p.cover);
      const entry = lock[p.slug];
      const stale = `${p.slug}: its cover changed since its card texture was made; run npm run card-textures`;
      expect(entry?.cover, stale).toBe(sha256(publicFile(p.cover.src)));
      expect(entry?.avif, stale).toBe(sha256(publicFile(card)));
      expect(entry?.webp, stale).toBe(sha256(publicFile(card.replace(/\.avif$/, ".webp"))));
    }
  });
});

describe("project imagery", () => {
  test("every cover (and its phone crop) and section image exists as AVIF and WebP at 1600 w and 800 w, at its size", async () => {
    for (const p of loadProjects()) {
      for (const v of projectImageFiles(p)) {
        const file = publicFile(v.src);
        expect(existsSync(file), v.src).toBe(true);
        const { width, height, format } = await sharp(file).metadata();
        expect({ width, height }, v.src).toEqual({ width: v.width, height: v.height });
        expect(format === "heif" ? "image/avif" : `image/${format}`, v.src).toBe(v.type);
      }
    }
  });

  test("every image's alt describes it, not a placeholder", () => {
    for (const p of loadProjects()) {
      for (const img of [p.cover, ...p.sections.map((s) => s.image)]) {
        expect(img.alt, img.src).not.toMatch(/abstract gradient|placeholder/i);
        expect(img.alt.length, img.src).toBeGreaterThan(30);
      }
    }
  });
});

describe("loadProjects", () => {
  const SLUGS = [
    "services-publics",
    "bornes-libre-service",
    "ministere-fonction-publique",
    "conformite-bancaire",
    "equip4safety",
    "tv-satellite",
    "schulyf",
    "drymhome",
    "orbit-portfolio",
  ];

  test.each(["fr", "en"] as const)("all 9 projects parse in %s, slugs unique, order 1..9", (locale) => {
    const projects = loadProjects(locale);
    expect(projects.map((p) => p.slug)).toEqual(SLUGS);
    expect(new Set(projects.map((p) => p.slug)).size).toBe(9);
    expect(projects.map((p) => p.order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  test("slugs, order, years and image files match across the two languages, and the words differ", () => {
    const fr = loadProjects("fr");
    const en = loadProjects("en");
    const shape = (p: (typeof fr)[number]) => [p.slug, p.order, p.year, p.featured, p.stats.length, p.cover.src, p.architecture.length, p.keyDecision === null, ...p.sections.map((s) => s.image.src)];
    expect(fr.map(shape)).toEqual(en.map(shape));
    for (const [a, b] of fr.map((p, i) => [p, en[i]] as const)) {
      expect(a.summary, a.slug).not.toBe(b.summary);
      expect(a.bodyHtml, a.slug).not.toBe(b.bodyHtml);
    }
  });

  test("counts and year ranges are computed from the files, in both languages", () => {
    expect(collectionSummary(loadProjects("en"), "en")).toBe("Nine projects, 2023 – 2026");
    expect(collectionSummary(loadProjects("fr"), "fr")).toBe("Neuf projets, 2023 – 2026");
    // The year is the period’s first year (e.g. “déc. 2025 — 2026” is 2025).
    const years = Object.fromEntries(loadProjects("fr").map((p) => [p.slug, p.year]));
    expect(years).toMatchObject({ "services-publics": 2023, "conformite-bancaire": 2025, "tv-satellite": 2024, schulyf: 2026, "orbit-portfolio": 2026 });
  });

  test("every project is complete and renders the problem, the fix and the result", () => {
    for (const locale of ["fr", "en"] as const) {
      for (const p of loadProjects(locale)) {
        expect(p.cover.src).toBe(`/projects/${p.slug}/cover.avif`);
        expect(p.stats.length).toBeGreaterThanOrEqual(2);
        expect(p.stats.length).toBeLessThanOrEqual(3);
        expect(p.sections.length).toBeGreaterThanOrEqual(1);
        expect(p.architecture.length).toBeGreaterThanOrEqual(3);
        expect((p.bodyHtml.match(/<h2>/g) ?? []).length, p.slug).toBe(3);
        expect(p.bodyHtml).toContain("<p>");
      }
    }
  });

  test("only the two projects whose source has no key decision lack one", () => {
    expect(loadProjects("en").filter((p) => p.keyDecision === null).map((p) => p.slug)).toEqual(["equip4safety", "drymhome"]);
  });
});
