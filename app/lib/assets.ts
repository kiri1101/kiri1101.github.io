// Self-hosted files that more than one module names.
//
// The fonts are imported, so the build fingerprints them: /assets/<name>-<hash>.woff2, cached for a year
// (public/_headers). tokens.css declares the same files by relative path, which Vite resolves to the same URLs
// (assets.test.ts checks that they agree).
import type { Locale } from "../i18n/locale";
import instrumentSerifItalic from "../fonts/instrument-serif-latin-400-italic.woff2?url";
import interTight from "../fonts/inter-tight-latin-wght-normal.woff2?url";

export const FONT_URLS = { interTight, instrumentSerifItalic } as const;

/** The orb poster: the home page's first image, in view on every arrival there. */
export const ORB_POSTER_SRC = "/orb-poster.avif";

/** The home page's share image, one per language (1200 x 630 JPEG, `npm run og`). */
export const homeOgImage = (locale: Locale): string => `/og-${locale}.jpg`;
