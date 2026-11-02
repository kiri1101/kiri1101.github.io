import { existsSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { describe, expect, test } from "vitest";
import { homeOgImage } from "./assets";
import { OG_IMAGE, ogImageSrc } from "./case-study";
import { loadProjects } from "./projects";

const publicFile = (src: string) => join(process.cwd(), "public", src);

/** The projects whose screens are illustrative mock-ups: their real interfaces are not shown (decision D5). */
const ILLUSTRATIVE = ["ministere-fonction-publique", "conformite-bancaire", "tv-satellite", "schulyf", "drymhome"];

describe("share images (Ruling R42)", () => {
  test("each project and each language's home page has a 1200 x 630 JPEG", async () => {
    const files = [...loadProjects("en").map((p) => ogImageSrc(p.cover)), homeOgImage("fr"), homeOgImage("en")];
    for (const src of files) {
      expect(existsSync(publicFile(src)), src).toBe(true);
      const { width, height, format } = await sharp(publicFile(src)).metadata();
      expect({ width, height, format }, src).toEqual({ width: OG_IMAGE.width, height: OG_IMAGE.height, format: "jpeg" });
    }
  });
});

describe("share images of illustrative mock-ups", () => {
  // The label sits bottom left (scripts/mockups/og-label.html): that corner differs from the plain crop of the cover
  // for the five mock-ups, and matches it (JPEG noise aside) for the projects with real screens.
  const corner = { left: 20, top: 540, width: 480, height: 80 };
  const meanDiff = async (slug: string) => {
    const cover = join(process.cwd(), "public", "projects", slug, "cover.webp");
    const crop = await sharp(cover).resize(OG_IMAGE.width).extract({ left: 0, top: 125, ...OG_IMAGE }).png().toBuffer();
    const plain = await sharp(crop).extract(corner).removeAlpha().raw().toBuffer();
    const og = await sharp(publicFile(`/projects/${slug}/og.jpg`)).extract(corner).removeAlpha().raw().toBuffer();
    let sum = 0;
    for (let i = 0; i < og.length; i++) sum += Math.abs(og[i] - plain[i]);
    return sum / og.length;
  };
  test("carry the bilingual label; the others do not", async () => {
    for (const p of loadProjects("en")) {
      const d = await meanDiff(p.slug);
      if (p.illustrative) expect(d, p.slug).toBeGreaterThan(25);
      else expect(d, p.slug).toBeLessThan(8);
    }
  });
});

describe("illustrative mock-ups", () => {
  test.each(["fr", "en"] as const)("exactly the five generated projects are marked illustrative, and say so in their alt text (%s)", (locale) => {
    const label = locale === "fr" ? "Maquette illustrative" : "Illustrative mock-up";
    const projects = loadProjects(locale);
    expect(projects.filter((p) => p.illustrative).map((p) => p.slug).sort()).toEqual([...ILLUSTRATIVE].sort());
    for (const p of projects) {
      for (const img of [p.cover, ...p.sections.map((s) => s.image)]) {
        if (p.illustrative) expect(img.alt, img.src).toMatch(new RegExp(`^${label}`));
        else expect(img.alt, img.src).not.toMatch(/illustrative|maquette/i);
      }
    }
  });
});
