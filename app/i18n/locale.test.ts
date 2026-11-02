import { describe, expect, test } from "vitest";
import { localeOfPath, pathInLocale, projectPath, resolve } from "./locale";
import { ui } from "./strings";

describe("paths", () => {
  test("the locale comes from the path", () => {
    for (const p of ["/", "/projets/x", "/zzz"]) expect(localeOfPath(p)).toBe("fr");
    for (const p of ["/en", "/en/", "/en/projects/x", "/en/nope"]) expect(localeOfPath(p)).toBe("en");
    expect(localeOfPath("/en.data")).toBe("en"); // the English home's loader data
    expect(localeOfPath("/_.data")).toBe("fr");
    expect(localeOfPath("/entity")).toBe("fr"); // not a prefix match
  });
  test("the switch maps a page to the same page in the other language", () => {
    expect(pathInLocale("/", "en")).toBe("/en");
    expect(pathInLocale("/en", "fr")).toBe("/");
    expect(pathInLocale("/projets/a-b", "en")).toBe("/en/projects/a-b");
    expect(pathInLocale("/en/projects/a-b/", "fr")).toBe("/projets/a-b");
    expect(pathInLocale("/en/nope", "fr")).toBe("/");
    expect(projectPath("fr", "a")).toBe("/projets/a");
  });
  test("resolve picks a side of every pair, deeply", () => {
    const v = { a: { fr: "x", en: "y" }, b: [{ fr: 1, en: 2 }], c: "same", f: () => 1 };
    expect(resolve(v, "fr")).toMatchObject({ a: "x", b: [1], c: "same" });
    expect(resolve(v, "en")).toMatchObject({ a: "y", b: [2] });
  });
});

/** Dictionary keys (dot paths), to check both languages define the same ones. */
function keys(o: object, prefix = ""): string[] {
  return Object.entries(o).flatMap(([k, v]) => (v && typeof v === "object" ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`]));
}
test("both dictionaries have exactly the same keys", () => {
  expect(keys(ui.en).sort()).toEqual(keys(ui.fr).sort());
});
