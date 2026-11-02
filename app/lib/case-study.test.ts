import { describe, expect, test } from "vitest";
import { site } from "~/site.config";
import {
  CASE_STUDY_BACKGROUND,
  caseStudyOf,
  imageVariants,
  PHONE_MEDIA,
  phoneCropOf,
  pictureOf,
  projectImageFiles,
  splitSummary,
} from "./case-study";
import { loadProjects } from "./projects";

describe("caseStudyOf", () => {
  const projects = loadProjects("en");

  test("numbers the project in the collection and links the next one, wrapping from the last to the first", () => {
    const first = caseStudyOf(projects, projects[0].slug, "en")!;
    expect(first.index).toBe(0);
    expect(first.count).toBe(projects.length);
    expect(first.next).toEqual({ slug: projects[1].slug, title: projects[1].title });
    const last = caseStudyOf(projects, projects.at(-1)!.slug, "en")!;
    expect(last.index).toBe(projects.length - 1);
    expect(last.next).toEqual({ slug: projects[0].slug, title: projects[0].title });
  });

  test("an unknown slug has no case study", () => {
    expect(caseStudyOf(projects, "does-not-exist", "en")).toBeNull();
  });

  test("canonical and Open Graph URLs are absolute, from the site's origin", () => {
    const cs = caseStudyOf(projects, "services-publics", "en")!;
    expect(cs.canonical).toBe(`${site.origin}/en/projects/services-publics`);
    expect(caseStudyOf(projects, "services-publics", "fr")!.canonical).toBe(`${site.origin}/projets/services-publics`);
    expect(cs.ogImage).toBe(`${site.origin}/projects/services-publics/og.jpg`);
  });

  test("the cover leads the gallery; every section keeps its caption", () => {
    const cs = caseStudyOf(projects, "services-publics", "en")!;
    expect(cs.cover.src).toBe("/projects/services-publics/cover.webp");
    expect(cs.sections.map((s) => s.lead)).toEqual(["Two entry points."]);
  });

  test("the page's background is the one source the CSS custom property takes", () => {
    expect(caseStudyOf(projects, "services-publics", "en")!.colours.background).toBe(CASE_STUDY_BACKGROUND);
  });

  test("the figures are the source’s quality items, three at most, with no phone label when the content gives none", () => {
    const stats = caseStudyOf(projects, "services-publics", "en")!.stats;
    expect(stats.map((s) => s.value)).toEqual(["≈ 900", "3", "Docker"]);
    expect(stats.every((s) => s.short === undefined)).toBe(true);
  });

  test("architecture and key decision come with the case study", () => {
    const cs = caseStudyOf(projects, "services-publics", "en")!;
    expect(cs.architecture.map((a) => a.label)).toEqual(["Browser", "Routes", "Business logic", "Services"]);
    expect(cs.keyDecision).toMatch(/Action classes/);
    expect(caseStudyOf(loadProjects("fr"), "services-publics", "fr")!.keyDecision).toMatch(/classes Action/);
    expect(caseStudyOf(projects, "equip4safety", "en")!.keyDecision).toBeNull();
  });
});

describe("images", () => {
  test("each image is AVIF and WebP, at 1600 w and 800 w, beside the source the content names", () => {
    expect(imageVariants({ src: "/projects/x/cover.avif", width: 1600, height: 1200, alt: "a" })).toEqual([
      { src: "/projects/x/cover-800.avif", type: "image/avif", width: 800, height: 600 },
      { src: "/projects/x/cover.avif", type: "image/avif", width: 1600, height: 1200 },
      { src: "/projects/x/cover-800.webp", type: "image/webp", width: 800, height: 600 },
      { src: "/projects/x/cover.webp", type: "image/webp", width: 1600, height: 1200 },
    ]);
  });

  test("a picture offers AVIF first, falls back to WebP, and keeps the declared size and alt", () => {
    const pic = pictureOf({ src: "/projects/x/section-1.avif", width: 1600, height: 1000, alt: "Screens" });
    expect(pic.sources).toEqual([
      { type: "image/avif", srcSet: "/projects/x/section-1-800.avif 800w, /projects/x/section-1.avif 1600w" },
    ]);
    expect(pic.src).toBe("/projects/x/section-1.webp");
    expect(pic.srcSet).toBe("/projects/x/section-1-800.webp 800w, /projects/x/section-1.webp 1600w");
    expect([pic.width, pic.height, pic.alt]).toEqual([1600, 1000, "Screens"]);
  });

  test("the cover's phone crop sits beside it and is served first on phones, AVIF then WebP, with its own size", () => {
    const cover = { src: "/projects/x/cover.avif", width: 1600, height: 1200, alt: "Cover" };
    const phone = phoneCropOf(cover);
    expect(phone).toEqual({ src: "/projects/x/cover-phone.avif", width: 1600, height: 1920, alt: "Cover" });
    const pic = pictureOf(cover, phone);
    expect(pic.sources.map((s) => [s.media, s.type, s.width, s.height])).toEqual([
      [PHONE_MEDIA, "image/avif", 1600, 1920],
      [PHONE_MEDIA, "image/webp", 1600, 1920],
      [undefined, "image/avif", undefined, undefined],
    ]);
    expect(pic.sources[0].srcSet).toBe("/projects/x/cover-phone-800.avif 800w, /projects/x/cover-phone.avif 1600w");
    // The <img> stays the cover's own: its size and alt.
    expect([pic.src, pic.width, pic.height]).toEqual(["/projects/x/cover.webp", 1600, 1200]);
  });

  test("a project's image files: cover, phone crop and sections, four variants each", () => {
    const p = loadProjects().find((x) => x.slug === "services-publics")!;
    expect(projectImageFiles(p)).toHaveLength(3 * 4);
  });
});

describe("summary", () => {
  test('splits at ", so" into the claim and its dimmed purpose', () => {
    expect(splitSummary("Rebuilding trust in a medication app, so taking the right dose feels effortless.")).toEqual({
      lead: "Rebuilding trust in a medication app,",
      rest: "so taking the right dose feels effortless.",
    });
  });

  test("a summary without that turn stays whole", () => {
    expect(splitSummary("A plain sentence.")).toEqual({ lead: "A plain sentence.", rest: null });
  });
});
