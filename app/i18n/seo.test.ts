import { describe, expect, test } from "vitest";
import { buildRobots, buildSitemap, languageMeta, projectPages } from "./seo";

const origin = "https://x.example";

describe("languageMeta", () => {
  const tags = languageMeta(origin, "en", projectPages("a-b"));
  test("canonical is the page's own language, with an alternate per language and x-default on French", () => {
    expect(tags).toContainEqual({ tagName: "link", rel: "canonical", href: "https://x.example/en/projects/a-b" });
    const alt = tags.filter((t) => t.rel === "alternate").map((t) => [t.hrefLang, t.href]);
    expect(alt).toEqual([
      ["fr", "https://x.example/projets/a-b"],
      ["en", "https://x.example/en/projects/a-b"],
      ["x-default", "https://x.example/projets/a-b"],
    ]);
  });
  test("og:locale names the page's language and the other one", () => {
    expect(tags).toContainEqual({ property: "og:locale", content: "en_US" });
    expect(tags).toContainEqual({ property: "og:locale:alternate", content: "fr_FR" });
    expect(languageMeta(origin, "fr", projectPages("a-b"))).toContainEqual({ property: "og:locale", content: "fr_FR" });
  });
});

describe("sitemap and robots", () => {
  const xml = buildSitemap(origin, ["a", "b"]);
  test("lists both languages of the home page and of every project", () => {
    for (const loc of ["/", "/en", "/projets/a", "/en/projects/a", "/projets/b", "/en/projects/b"]) {
      expect(xml).toContain(`<loc>${origin}${loc}</loc>`);
    }
    expect(xml.match(/<url>/g)).toHaveLength(6);
    expect(xml).not.toContain("/404");
  });
  test("robots points at the sitemap", () => {
    expect(buildRobots(origin)).toContain("Sitemap: https://x.example/sitemap.xml");
  });
});
