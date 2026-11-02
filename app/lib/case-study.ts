/**
 * What a case-study page shows, computed at build time from the project content (the route's loader). Pure: no
 * markdown parser and no DOM, so the page's components never pull the content tooling into the browser.
 */
import { projectPath, type Locale } from "../i18n/locale";
import { site } from "../site.config";
import { highlightOf, rgba } from "./colour";
import { IMAGE_WIDTHS, PHONE_CROP } from "./images";
import type { Image, Project } from "./projects";

export { IMAGE_WIDTHS, PHONE_CROP };
const LARGEST = IMAGE_WIDTHS[IMAGE_WIDTHS.length - 1];

/** Where the phone crop replaces the cover: the case-study CSS's phone layout. */
export const PHONE_MEDIA = "(max-width: 760px)";

/** How wide the phone crop is drawn: the viewport less the 22 px gutters. */
const PHONE_SIZES = "calc(100vw - 44px)";

/** The cover's phone crop, as an image of its own: same alt, its own size. */
export function phoneCropOf(cover: Image): Image {
  return {
    src: cover.src.replace(/\.(avif|webp)$/, `${PHONE_CROP.suffix}.$1`),
    width: PHONE_CROP.width,
    height: PHONE_CROP.height,
    alt: cover.alt,
  };
}

export type ImageVariant = { src: string; type: "image/avif" | "image/webp"; width: number; height: number };

/**
 * The files written for an image whose content `src` is `<dir>/<name>.avif` (the 1600 w AVIF): AVIF then WebP, each
 * at every width, the largest without a suffix and the others as `<name>-<width>.<ext>`.
 */
export function imageVariants(img: Image): ImageVariant[] {
  const base = img.src.replace(/\.(avif|webp)$/, "");
  return (["avif", "webp"] as const).flatMap((ext) =>
    IMAGE_WIDTHS.map((w) => ({
      src: w === LARGEST ? `${base}.${ext}` : `${base}-${w}.${ext}`,
      type: `image/${ext}` as const,
      width: w,
      height: Math.round((img.height * w) / img.width),
    })),
  );
}

export type PictureSource = {
  type: string;
  srcSet: string;
  /** Art direction: this source applies only where the media query matches, with its own size and `sizes`. */
  media?: string;
  sizes?: string;
  width?: number;
  height?: number;
};

export type Picture = {
  /** `<source>`s in order of preference; the `<img>` itself is the WebP fallback. */
  sources: PictureSource[];
  src: string;
  srcSet: string;
  width: number;
  height: number;
  alt: string;
};

const srcSetOf = (img: Image, type: string) =>
  imageVariants(img)
    .filter((v) => v.type === type)
    .map((v) => `${v.src} ${v.width}w`)
    .join(", ");

/** A picture of `img`: AVIF first, WebP as the fallback. With `phone`, that crop (AVIF, then WebP) on phones. */
export function pictureOf(img: Image, phone?: Image): Picture {
  const fallback = imageVariants(img).filter((v) => v.type === "image/webp").at(-1)!;
  const phoneSources: PictureSource[] = phone
    ? (["image/avif", "image/webp"] as const).map((type) => ({
        type,
        srcSet: srcSetOf(phone, type),
        media: PHONE_MEDIA,
        sizes: PHONE_SIZES,
        width: phone.width,
        height: phone.height,
      }))
    : [];
  return {
    sources: [...phoneSources, { type: "image/avif", srcSet: srcSetOf(img, "image/avif") }],
    src: fallback.src,
    srcSet: srcSetOf(img, "image/webp"),
    width: img.width,
    height: img.height,
    alt: img.alt,
  };
}

/** The summary as the page sets it: the claim in full colour and, after ", so", its purpose dimmed. */
export function splitSummary(summary: string): { lead: string; rest: string | null } {
  const at = summary.indexOf(", so ");
  if (at < 0) return { lead: summary, rest: null };
  return { lead: summary.slice(0, at + 1), rest: summary.slice(at + 2) };
}

// ---------- the page ----------

/**
 * The case-study page's background. The single source: the route sets it as `--cs-bg`, and the highlight is made
 * to read on it. case-study.css repeats it only as the default for the 404 page; a unit test keeps the two equal.
 */
export const CASE_STUDY_BACKGROUND = "#0b0b0e";

/** How strongly the backdrop's glow shows the highlight at its peak (case-study.css draws it with `--cs-glow`). */
export const GLOW_ALPHA = 0.16;

export type CaseStudy = Pick<
  Project,
  "slug" | "title" | "illustrative" | "year" | "discipline" | "role" | "timeline" | "team" | "platforms" | "stats" | "links" | "architecture" | "keyDecision" | "bodyHtml"
> & {
  /** Position in the collection (0-based) and the collection's size: "01 / 12". */
  index: number;
  count: number;
  description: string;
  summary: { lead: string; rest: string | null };
  /** The cover, with its portrait crop for phones. */
  cover: Picture;
  sections: { picture: Picture; lead: string; caption: string }[];
  /** Colours for the page: its background, the accent gradient (image placeholders), the highlight and its glow. */
  colours: { background: string; from: string; to: string; highlight: string; glow: string };
  next: { slug: string; title: string };
  canonical: string;
  ogImage: string;
  ogImageAlt: string;
};

/** The project's Open Graph image beside its cover: `og.jpg`, 1200 x 630, written by `npm run og`. */
export const OG_IMAGE = { width: 1200, height: 630 } as const;
export const ogImageSrc = (cover: Image): string => cover.src.replace(/[^/]+$/, "og.jpg");

/** The case study for `slug`, or null when no project has it. `projects` in collection order. */
export function caseStudyOf(projects: Project[], slug: string, locale: Locale): CaseStudy | null {
  const index = projects.findIndex((p) => p.slug === slug);
  if (index < 0) return null;
  const p = projects[index];
  const next = projects[(index + 1) % projects.length];
  const highlight = highlightOf(p.accent, CASE_STUDY_BACKGROUND);
  const cover = pictureOf(p.cover, phoneCropOf(p.cover));
  return {
    slug: p.slug,
    title: p.title,
    illustrative: p.illustrative,
    year: p.year,
    discipline: p.discipline,
    role: p.role,
    timeline: p.timeline,
    team: p.team,
    platforms: p.platforms,
    stats: p.stats,
    links: p.links,
    architecture: p.architecture,
    keyDecision: p.keyDecision,
    bodyHtml: p.bodyHtml,
    index,
    count: projects.length,
    description: p.summary,
    summary: splitSummary(p.summary),
    cover,
    sections: p.sections.map((s) => ({ picture: pictureOf(s.image), lead: s.lead, caption: s.caption })),
    colours: {
      background: CASE_STUDY_BACKGROUND,
      from: p.accent.from,
      to: p.accent.to,
      highlight,
      glow: rgba(highlight, GLOW_ALPHA),
    },
    next: { slug: next.slug, title: next.title },
    canonical: `${site.origin}${projectPath(locale, p.slug)}`,
    ogImage: `${site.origin}${ogImageSrc(p.cover)}`,
    ogImageAlt: cover.alt,
  };
}

/** Every image file a project's pages use: its cover, the cover's phone crop and each section image, all variants. */
export function projectImageFiles(p: Project): ImageVariant[] {
  return [p.cover, phoneCropOf(p.cover), ...p.sections.map((s) => s.image)].flatMap(imageVariants);
}
