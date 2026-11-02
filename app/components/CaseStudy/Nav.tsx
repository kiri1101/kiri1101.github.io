import { useContext, useEffect, useState } from "react";
import { Link, UNSAFE_FrameworkContext as FrameworkContext } from "react-router";
import type { Locale } from "~/i18n/locale";
import { FONT_URLS, ORB_POSTER_SRC } from "~/lib/assets";
import { whenIdle } from "~/lib/idle";
import { LanguageSwitch } from "~/components/LanguageSwitch";
import { homePath } from "~/i18n/locale";
import { useLocale, useSite, useUi } from "~/i18n/use-locale";
import { monogramOf } from "~/site.config";

/** How long the home prefetch may wait for an idle moment. */
const PREFETCH_IDLE_TIMEOUT_MS = 2000;
/** The home route in React Router's manifest, and its loader data as the prerendered build serves it. */
const HOME_ROUTE_ID = { fr: "routes/_index", en: "routes/_index.en" } as const;
const HOME_DATA = { fr: "/_.data", en: "/en.data" } as const;

/** True once the page has been idle (or PREFETCH_IDLE_TIMEOUT_MS has passed) since it rendered. */
function useIdle(): boolean {
  const [idle, setIdle] = useState(false);
  useEffect(() => whenIdle(() => setIdle(true), PREFETCH_IDLE_TIMEOUT_MS), []);
  return idle;
}

/** The home route's files, from the router's manifest: its module and the modules it imports, and its styles. */
function useHomeRouteFiles(locale: Locale): { scripts: string[]; styles: string[] } {
  const route = useContext(FrameworkContext)?.manifest?.routes?.[HOME_ROUTE_ID[locale]];
  return { scripts: route ? [route.module, ...(route.imports ?? [])] : [], styles: route?.css ?? [] };
}

/**
 * Whether this page has fetched the file already (the modules home shares with it, or files of an earlier visit to
 * home in this session): a prefetch would fetch it again rather than take it from the cache.
 */
const fetchedHere = (href: string) => performance.getEntriesByName(new URL(href, location.href).href).length > 0;

/**
 * The way home, fetched ahead into the HTTP cache: the home route's modules, styles and data, its serif face and its
 * poster. React holds a view transition's cross-fade until the new page's fonts and in-view images have loaded, so
 * "Back to orbit" then starts it without waiting for the network. The 3D scene is not part of it.
 *
 * Plain prefetches, not React Router's own (`<PrefetchPageLinks>`, `<Link prefetch>`): those preload the modules
 * (`modulepreload`), which are fetched at once and parsed, and in Firefox a module preload still in flight cancels
 * the next document navigation (seen in the fix-2 e2e run; a plain prefetch in flight does not). A prefetch has the
 * lowest priority, parses nothing and is dropped quietly when the page leaves. Safari has no prefetch: there the way
 * back loads as it goes.
 */
function HomePrefetch({ locale }: { locale: Locale }) {
  const { scripts, styles } = useHomeRouteFiles(locale);
  const files: { href: string; as: string; type?: string; crossOrigin?: "anonymous" }[] = [
    ...scripts.map((href) => ({ href, as: "script", crossOrigin: "anonymous" as const })),
    ...styles.map((href) => ({ href, as: "style" })),
    { href: HOME_DATA[locale], as: "fetch" },
    { href: FONT_URLS.instrumentSerifItalic, as: "font", type: "font/woff2", crossOrigin: "anonymous" },
    { href: ORB_POSTER_SRC, as: "image" },
  ];
  return (
    <>
      {files
        .filter((f) => !fetchedHere(f.href))
        .map((f) => (
          <link key={f.href} rel="prefetch" href={f.href} as={f.as} type={f.type} crossOrigin={f.crossOrigin} />
        ))}
    </>
  );
}

type Props = {
  /** The project the page shows: "Back to orbit" opens the galaxy on it. Omitted, there is no back link. */
  slug?: string;
  /** Where the language switch goes, when it is not the same page in the other language. */
  switchTo?: string;
};

/**
 * The case study's top bar: the owner's name home, the way back into the galaxy, and the language switch. On phones
 * the links show shorter text (the monogram, "Orbit"), and the visible text is always part of the accessible name
 * (WCAG 2.5.3): the logo reads "JT Jordan Tukum Folem" there, the back link "Back to orbit". Both lead to the home page of
 * the page's language, which is fetched ahead once the page is idle (HomePrefetch). `switchTo` is where the switch
 * goes when the page has no counterpart in the other language (the 404 pages).
 */
export function CaseStudyNav({ slug, switchTo }: Props) {
  const idle = useIdle();
  const locale = useLocale();
  const u = useUi().study;
  const { owner } = useSite();
  const home = homePath(locale);
  return (
    <header className="cs-nav">
      {idle && <HomePrefetch locale={locale} />}
      <Link className="cs-logo" to={home} viewTransition>
        <span className="cs-narrow">{monogramOf(owner.name)}</span>{" "}
        <span className="cs-wide">{owner.name}</span>
      </Link>
      <div className="cs-nav-end">
        {slug && (
          <Link className="cs-back" to={`${home}#${slug}`} viewTransition>
            <i aria-hidden="true">←</i> <span className="cs-wide">{u.back}</span>
            <span className="cs-narrow" aria-hidden="true">
              {u.backShort}
            </span>
          </Link>
        )}
        <LanguageSwitch to={switchTo} />
      </div>
    </header>
  );
}
