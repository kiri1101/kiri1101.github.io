import { expect, test } from "vitest";
import { isLocalized, resolve } from "./i18n/locale";
import { experienceYears, formatYears, monogramOf, site, siteIn } from "./site.config";

test("monogram derives from a name", () => expect(monogramOf("Ada Byron")).toBe("AB"));

// The credit is a licence-style obligation, so its exact text is pinned. The rest of the copy is the owner's to change.
test("the deep field's credit is kept as the image's source requires", () => {
  expect(site.imageCredit).toBe("Webb's First Deep Field · NASA, ESA, CSA, STScI");
});

test("site config has the shape the page relies on", () => {
  expect(site.hero.headline).toHaveLength(2);
  expect(site.palette).toHaveLength(3); // sphere, monogram, ring
  expect(site.origin).toBe("https://jordan-tukum.pages.dev"); // no trailing slash: paths are appended to it
  expect(site.owner.email).toMatch(/^[^@\s]+@[^@\s]+$/);
  expect(site.about.facts.length).toBeGreaterThan(0);
  expect(site.about.experience.some((e) => e.to === null)).toBe(true); // a current role
});

test("every text of the config is written in both languages, so each language resolves to plain strings", () => {
  const find = (v: unknown, path: string, out: string[]) => {
    if (isLocalized(v)) return void (typeof v.fr === "string" && typeof v.en === "string" ? 0 : out.push(path));
    if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) find(x, `${path}.${k}`, out);
  };
  const bad: string[] = [];
  find(site, "site", bad);
  expect(bad).toEqual([]);
  for (const l of ["fr", "en"] as const) {
    const json = JSON.stringify(resolve({ ...site, about: { ...site.about, facts: [] } }, l));
    expect(json).not.toContain('"fr":'); // no { fr, en } pair left
    expect(json).not.toContain('"en":');
  }
  expect(siteIn("fr").cta.label).toBe("Parlons-en");
  expect(siteIn("en").cta.label).toBe("Let's talk");
  expect(siteIn("fr")).toBe(siteIn("fr")); // resolved once per language
});

test("experience ranges are formatted from data", () => {
  expect(formatYears(2022, null, "now")).toBe("2022 – now");
  expect(formatYears(2022, null, "aujourd’hui")).toBe("2022 – aujourd’hui");
  expect(formatYears(2018, 2022, "now")).toBe("2018 – 2022");
});

test("the years of experience count from the earliest role", () => {
  const first = Math.min(...site.about.experience.map((e) => e.from));
  expect(experienceYears(first + 12, "en")).toBe("12 years");
  expect(experienceYears(first + 1, "en")).toBe("1 year");
  expect(experienceYears(first + 12, "fr")).toBe("12 ans");
  expect(experienceYears(first + 1, "fr")).toBe("1 an");
});
