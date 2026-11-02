import matter from "gray-matter";
import { marked } from "marked";
import type { Locale } from "../i18n/locale";
import { ui } from "../i18n/strings";

export type Image = { src: string; width: number; height: number; alt: string };

export type Project = {
  slug: string;
  title: string;
  year: number;
  discipline: string;
  category: string;
  summary: string;
  role: string;
  timeline: string;
  team: string;
  platforms: string;
  /** Outcome figures. `short`, optional: a one-line label for phones, where two figures share the width. */
  stats: { value: string; label: string; short?: string }[];
  sections: { image: Image; lead: string; caption: string }[];
  order: number;
  featured: boolean;
  /** True when the images are illustrative mock-ups, not captures of the real interface: the page captions them as such. */
  illustrative: boolean;
  cover: Image;
  accent: { from: string; to: string };
  links: { label: string; url: string }[];
  /** The layers the project is made of, top to bottom: a name and what it does. */
  architecture: { label: string; description: string }[];
  /** The one design choice the case study explains; null when the file has none. */
  keyDecision: string | null;
  bodyHtml: string;
};

export class ProjectContentError extends Error {
  constructor(file: string, field: string, problem = "is missing or invalid") {
    super(`${file}: field "${field}" ${problem}`);
    this.name = "ProjectContentError";
  }
}

type Data = Record<string, unknown>;

const str = (d: Data, key: string, file: string): string => {
  const v = d[key];
  if (typeof v !== "string" || v.trim() === "") throw new ProjectContentError(file, key);
  return v;
};

const num = (d: Data, key: string, file: string): number => {
  const v = d[key];
  if (typeof v !== "number" || !Number.isFinite(v)) throw new ProjectContentError(file, key);
  return v;
};

const obj = (d: Data, key: string, file: string): Data => {
  const v = d[key];
  if (typeof v !== "object" || v === null || Array.isArray(v)) throw new ProjectContentError(file, key);
  return v as Data;
};

const list = (d: Data, key: string, file: string, min = 0): Data[] => {
  const v = d[key] ?? (min === 0 ? [] : undefined);
  if (!Array.isArray(v) || v.length < min) throw new ProjectContentError(file, key);
  return v.map((item, i) => {
    if (typeof item !== "object" || item === null) throw new ProjectContentError(file, `${key}[${i}]`);
    return item as Data;
  });
};

const image = (d: Data, key: string, file: string): Image => {
  const i = obj(d, key, file);
  return {
    src: str(i, "src", file),
    width: num(i, "width", file),
    height: num(i, "height", file),
    alt: str(i, "alt", file),
  };
};

const accentOf = (d: Data, file: string): Project["accent"] => {
  const a = obj(d, "accent", file);
  return { from: str(a, "from", file), to: str(a, "to", file) };
};

/** Lower-case words joined by single hyphens: the slug is the URL (/projets/<slug>, /en/projects/<slug>) and the file name. */
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** The most outcome figures a case study shows: the header row has room for three. */
const MAX_STATS = 3;

export function parseProject(raw: string, file: string): Project {
  const { data, content } = matter(raw);
  const slug = str(data, "slug", file);
  if (!SLUG.test(slug)) throw new ProjectContentError(file, "slug", `"${slug}" is not lower-case words joined by hyphens`);
  if (slug !== file.replace(/.md$/, "")) throw new ProjectContentError(file, "slug", `"${slug}" does not match the file name`);
  const pair = (items: Data[], key: string, a: string, b: string) =>
    items.map((it, i) => ({ [a]: str(it, a, `${file} (${key}[${i}])`), [b]: str(it, b, `${file} (${key}[${i}])`) }));

  return {
    slug,
    title: str(data, "title", file),
    year: num(data, "year", file),
    discipline: str(data, "discipline", file),
    category: str(data, "category", file),
    summary: str(data, "summary", file),
    role: str(data, "role", file),
    timeline: str(data, "timeline", file),
    team: str(data, "team", file),
    platforms: str(data, "platforms", file),
    stats: capped(list(data, "stats", file, 2), "stats", file, MAX_STATS).map((s, i) => {
      const where = `${file} (stats[${i}])`;
      const stat: Project["stats"][number] = { value: str(s, "value", where), label: str(s, "label", where) };
      if (s.short !== undefined) stat.short = str(s, "short", where);
      return stat;
    }),
    sections: list(data, "sections", file, 1).map((s, i) => ({
      image: image(s, "image", `${file} (sections[${i}])`),
      lead: str(s, "lead", `${file} (sections[${i}])`),
      caption: str(s, "caption", `${file} (sections[${i}])`),
    })),
    order: num(data, "order", file),
    featured: data.featured === true,
    illustrative: data.illustrative === true,
    cover: image(data, "cover", file),
    accent: accentOf(data, file),
    links: pair(list(data, "links", file), "links", "label", "url") as Project["links"],
    architecture: list(data, "architecture", file).map((a, i) => {
      const where = `${file} (architecture[${i}])`;
      return { label: str(a, "label", where), description: str(a, "description", where) };
    }),
    keyDecision: data.keyDecision === undefined ? null : str(data, "keyDecision", file),
    bodyHtml: marked.parse(content, { async: false }),
  };
}

/**
 * The 3D scene's copy of a cover, beside it: `card.avif` (with a `card.webp` sibling) at the scene's texture size,
 * written by `npm run card-textures`.
 */
export function cardTextureSrc(cover: Image): string {
  return cover.src.replace(/[^/]+$/, "card.avif");
}

const capped = <T>(items: T[], key: string, file: string, max: number): T[] => {
  if (items.length > max) throw new ProjectContentError(file, key, `has ${items.length} entries, at most ${max} fit`);
  return items;
};

/** Slugs are URLs and orders are positions in the orbit: neither may repeat. Returns the projects, sorted by order. */
export function sortedUnique(projects: Project[]): Project[] {
  const slugs = new Set<string>();
  const orders = new Set<number>();
  for (const p of projects) {
    if (slugs.has(p.slug)) throw new ProjectContentError(`${p.slug}.md`, "slug", "is used by another project");
    if (orders.has(p.order)) throw new ProjectContentError(`${p.slug}.md`, "order", `${p.order} is used by another project`);
    slugs.add(p.slug);
    orders.add(p.order);
  }
  return [...projects].sort((a, b) => a.order - b.order);
}

/**
 * The projects in `locale`, in collection order. Each language has its own folder, `content/projects/<locale>/<slug>.md`.
 * Slugs, orders and image files are the same in both (a unit test holds that), because the build prerenders one slug list.
 */
export function loadProjects(locale: Locale = "fr"): Project[] {
  const files = import.meta.glob("/content/projects/*/*.md", { query: "?raw", import: "default", eager: true }) as Record<
    string,
    string
  >;
  const own = Object.entries(files).filter(([path]) => path.split("/").at(-2) === locale);
  return sortedUnique(own.map(([path, raw]) => parseProject(raw, path.split("/").pop() ?? path)));
}

const ONES = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve",
  "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

export function inWords(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > 99) return String(n);
  if (n < 20) return ONES[n];
  const [t, o] = [Math.floor(n / 10), n % 10];
  return o === 0 ? TENS[t] : `${TENS[t]}-${ONES[o]}`;
}

const ONES_FR = ["zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix", "onze", "douze",
  "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf"];
const TENS_FR = ["", "", "vingt", "trente", "quarante", "cinquante", "soixante"];

/** A count in French words, to 99: "vingt et un", "soixante-quinze", "quatre-vingts", "quatre-vingt-dix-sept". */
export function inWordsFr(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > 99) return String(n);
  if (n < 20) return ONES_FR[n];
  if (n >= 80) return n === 80 ? "quatre-vingts" : `quatre-vingt-${ONES_FR[n - 80]}`;
  const [t, o] = [Math.floor(n / 10), n % 10];
  if (t === 7) return o === 1 ? "soixante et onze" : `soixante-${ONES_FR[10 + o]}`;
  if (o === 0) return TENS_FR[t];
  return o === 1 ? `${TENS_FR[t]} et un` : `${TENS_FR[t]}-${ONES_FR[o]}`;
}

export function collectionSummary(projects: Pick<Project, "year">[], locale: Locale): string {
  const words = ui[locale].summary;
  if (projects.length === 0) return words.none;
  const years = projects.map((p) => p.year);
  const min = Math.min(...years);
  const max = Math.max(...years);
  const count = (locale === "fr" ? inWordsFr : inWords)(projects.length);
  const label = `${count[0].toUpperCase()}${count.slice(1)} ${projects.length === 1 ? words.project : words.projects}`;
  return min === max ? `${label}, ${min}` : `${label}, ${min} – ${max}`;
}
