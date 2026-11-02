import { DEFAULT_LOCALE, LOCALES, OG_LOCALE, homePath, otherLocale, projectPath, type Locale } from "./locale";

type Pages = Record<Locale, string>;

/** The two addresses (paths) of one page, one per language. */
export const homePages = (): Pages => ({ fr: homePath("fr"), en: homePath("en") });
export const projectPages = (slug: string): Pages => ({ fr: projectPath("fr", slug), en: projectPath("en", slug) });

/**
 * The language tags of a page: its canonical address, an `hreflang` alternate for each language and `x-default`
 * (the default language), and the `og:locale` pair. `pages` holds the page's path in each language.
 */
export function languageMeta(origin: string, locale: Locale, pages: Pages) {
  const url = (l: Locale) => `${origin}${pages[l]}`;
  return [
    { tagName: "link", rel: "canonical", href: url(locale) },
    ...LOCALES.map((l) => ({ tagName: "link", rel: "alternate", hrefLang: l, href: url(l) })),
    { tagName: "link", rel: "alternate", hrefLang: "x-default", href: url(DEFAULT_LOCALE) },
    { property: "og:locale", content: OG_LOCALE[locale] },
    { property: "og:locale:alternate", content: OG_LOCALE[otherLocale(locale)] },
    { property: "og:url", content: url(locale) },
  ];
}

const xml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

/** sitemap.xml: every page in both languages, each entry listing both of its alternates. */
export function buildSitemap(origin: string, slugs: string[]): string {
  const pages = [homePages(), ...slugs.map(projectPages)];
  const urls = pages.flatMap((p) =>
    LOCALES.map((l) => {
      const alternates = [
        ...LOCALES.map((a) => `    <xhtml:link rel="alternate" hreflang="${a}" href="${xml(origin + p[a])}"/>`),
        `    <xhtml:link rel="alternate" hreflang="x-default" href="${xml(origin + p[DEFAULT_LOCALE])}"/>`,
      ].join("\n");
      return `  <url>\n    <loc>${xml(origin + p[l])}</loc>\n${alternates}\n  </url>`;
    }),
  );
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join("\n")}\n</urlset>\n`;
}

export function buildRobots(origin: string): string {
  return `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`;
}
