/**
 * Locales and URLs. French is the default and lives at the root; English lives under /en. The locale of a page is
 * read from its path alone, so the build, the router and the browser always agree on it.
 */
export const LOCALES = ["fr", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "fr";

/** A value written in both languages. */
export type Localized<T> = { fr: T; en: T };

export const otherLocale = (l: Locale): Locale => (l === "fr" ? "en" : "fr");

/** The `og:locale` value of each language. */
export const OG_LOCALE: Record<Locale, string> = { fr: "fr_FR", en: "en_US" };

/** `/en`, `/en/…`, and the data file the router fetches for the English home page (`/en.data`). */
export function localeOfPath(pathname: string): Locale {
  return /^\/en(?:$|[/.])/.test(pathname) ? "en" : "fr";
}

export const homePath = (l: Locale): string => (l === "en" ? "/en" : "/");
export const projectPath = (l: Locale, slug: string): string =>
  l === "en" ? `/en/projects/${slug}` : `/projets/${slug}`;
/** The English 404 page (a prerendered route, so the build can write `en/404.html`). The French one is the root 404.html. */
export const EN_NOT_FOUND_PATH = "/en/404";

const PROJECT = /^\/(?:en\/projects|projets)\/([^/]+)$/;

/** The same page in `target`: a case study maps to the same project, anything else to that language's home. */
export function pathInLocale(pathname: string, target: Locale): string {
  const clean = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  const slug = PROJECT.exec(clean)?.[1];
  return slug ? projectPath(target, slug) : homePath(target);
}

/** True for a value written as `{ fr, en }` and nothing else. */
export function isLocalized(v: unknown): v is Localized<unknown> {
  if (typeof v !== "object" || v === null || Array.isArray(v)) return false;
  const keys = Object.keys(v);
  return keys.length === 2 && keys.includes("fr") && keys.includes("en");
}

/** Every `{ fr, en }` inside `T` replaced by its value; functions and other values stay as they are. */
export type Resolved<T> = T extends { readonly fr: infer F; readonly en: unknown }
  ? Resolved<F>
  : T extends (...args: never[]) => unknown
    ? T
    : T extends object
      ? { [K in keyof T]: Resolved<T[K]> }
      : T;

/** `value` with every `{ fr, en }` replaced by its `locale` side. */
export function resolve<T>(value: T, locale: Locale): Resolved<T> {
  if (isLocalized(value)) return resolve(value[locale], locale) as Resolved<T>;
  if (Array.isArray(value)) return value.map((v) => resolve(v, locale)) as Resolved<T>;
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, resolve(v, locale)])) as Resolved<T>;
  }
  return value as Resolved<T>;
}
