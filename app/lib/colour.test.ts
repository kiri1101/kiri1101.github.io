import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { CASE_STUDY_BACKGROUND, GLOW_ALPHA } from "./case-study";
import { blend, contrastRatio, highlightOf, hueOf } from "./colour";
import { loadProjects } from "./projects";

const CREAM = "#f2efe8";
const css = readFileSync(join(process.cwd(), "app", "styles", "case-study.css"), "utf8");

describe("highlight colour", () => {
  test("every project's highlight keeps its hue and reads on the dark page (AAA, 7:1)", () => {
    for (const p of loadProjects()) {
      const h = highlightOf(p.accent, CASE_STUDY_BACKGROUND);
      expect(contrastRatio(h, CASE_STUDY_BACKGROUND), `${p.slug} ${h}`).toBeGreaterThanOrEqual(7);
      const [hue, saturated] = hueOf(p.accent.to);
      if (saturated) expect(Math.abs(hueOf(h)[0] - hue), `${p.slug} hue`).toBeLessThan(4);
    }
  });

  test("a colour that already reads is kept", () => {
    expect(highlightOf({ from: "#ece0cf", to: "#cbb495" }, CASE_STUDY_BACKGROUND)).toBe("#cbb495");
  });
});

describe("contrast", () => {
  test("contrast ratio follows WCAG", () => {
    expect(contrastRatio("#ffffff", "#000000")).toBeCloseTo(21, 5);
    expect(contrastRatio("#777777", "#ffffff")).toBeCloseTo(4.48, 2);
  });

  test("blending composites over the colour below", () => {
    expect(blend("#ffffff", 0.5, "#000000")).toBe("#808080");
    expect(blend("#123456", 1, "#000000")).toBe("#123456");
  });

  // The backdrop's glow lightens the page most at its peak; every translucent cream text colour on the case-study
  // page must still read there (AA, 4.5:1), for every project's glow.
  test("every dimmed text colour on the case-study page reads at the glow's peak, for every project", () => {
    const alphas = [...css.matchAll(/(?:^|[\s;{])(?:color|--cs-dim):\s*rgba\(242, 239, 232, ([\d.]+)\)/g)].map((m) => Number(m[1]));
    expect(alphas.length, "text colours found in case-study.css").toBeGreaterThanOrEqual(5);
    for (const p of loadProjects()) {
      const glowPeak = blend(highlightOf(p.accent, CASE_STUDY_BACKGROUND), GLOW_ALPHA, CASE_STUDY_BACKGROUND);
      for (const alpha of alphas) {
        const text = blend(CREAM, alpha, glowPeak);
        expect(contrastRatio(text, glowPeak), `${p.slug}: cream at ${alpha} over ${glowPeak}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});

describe("one source for the page background", () => {
  test("case-study.css's default --cs-bg (the 404 page's) is the page background the code uses", () => {
    const declared = css.match(/--cs-bg:\s*(#[0-9a-f]{3,6})/i)?.[1];
    expect(declared?.toLowerCase()).toBe(CASE_STUDY_BACKGROUND);
  });
});
