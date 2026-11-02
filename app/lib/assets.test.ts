import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { FONT_URLS } from "./assets";

const tokens = readFileSync(new URL("../styles/tokens.css", import.meta.url), "utf8");
const faces = tokens.match(/@font-face\s*{[^}]*}/g) ?? [];
/** The file a URL names (under Vitest an import's URL is the source path, unhashed). */
const fileOf = (url: string) => url.split("/").pop()!;

test("tokens.css declares exactly the faces the code imports, from the same files, each by relative path", () => {
  const declared = faces.map((f) => f.match(/src:\s*url\("([^"]+)"\)/)?.[1]);
  expect(declared.every((u) => u?.startsWith("../fonts/"))).toBe(true);
  expect(declared.map((u) => fileOf(u!)).sort()).toEqual(Object.values(FONT_URLS).map(fileOf).sort());
});

test("at most two faces, each shown at once in a fallback face while it loads (font-display: swap)", () => {
  expect(faces.length).toBeGreaterThan(0);
  expect(faces.length).toBeLessThanOrEqual(2);
  for (const face of faces) expect(face).toMatch(/font-display:\s*swap;/);
});
