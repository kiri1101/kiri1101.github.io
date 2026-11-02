import { expect, test } from "vitest";
import { assertTurnstileKey, resolveTurnstileSiteKey, TURNSTILE_SITE_KEY, TURNSTILE_TEST_KEY } from "./turnstile-key";

test("a production deploy gets the production site key; local, CI and e2e builds get none (the site uses the test key)", () => {
  expect(resolveTurnstileSiteKey({ CF_PAGES: "1" })).toBe(TURNSTILE_SITE_KEY);
  expect(resolveTurnstileSiteKey({ REQUIRE_TURNSTILE_KEY: "1" })).toBe(TURNSTILE_SITE_KEY);
  expect(resolveTurnstileSiteKey({})).toBeUndefined();
  expect(resolveTurnstileSiteKey({ CI: "true" })).toBeUndefined();
  expect(resolveTurnstileSiteKey({ CF_PAGES: "1", VITE_TURNSTILE_SITE_KEY: "0x4AAAAAAAother" })).toBe("0x4AAAAAAAother");
  expect(TURNSTILE_SITE_KEY).not.toBe(TURNSTILE_TEST_KEY);
  expect(() => assertTurnstileKey({ CF_PAGES: "1", VITE_TURNSTILE_SITE_KEY: resolveTurnstileSiteKey({ CF_PAGES: "1" }) })).not.toThrow();
});

test("a Pages build without a real Turnstile site key fails with a clear message", () => {
  expect(() => assertTurnstileKey({ CF_PAGES: "1" })).toThrow(/VITE_TURNSTILE_SITE_KEY/);
  expect(() => assertTurnstileKey({ CF_PAGES: "1", VITE_TURNSTILE_SITE_KEY: "" })).toThrow(/VITE_TURNSTILE_SITE_KEY/);
  expect(() => assertTurnstileKey({ CF_PAGES: "1", VITE_TURNSTILE_SITE_KEY: TURNSTILE_TEST_KEY })).toThrow(/test key/);
});

test("a Pages build with a real key, and any local or CI build, passes", () => {
  expect(() => assertTurnstileKey({ CF_PAGES: "1", VITE_TURNSTILE_SITE_KEY: "0x4AAAAAAAreal" })).not.toThrow();
  expect(() => assertTurnstileKey({})).not.toThrow();
  expect(() => assertTurnstileKey({ CI: "true" })).not.toThrow();
});

test("REQUIRE_TURNSTILE_KEY=1 applies the same check outside Pages", () => {
  expect(() => assertTurnstileKey({ REQUIRE_TURNSTILE_KEY: "1" })).toThrow(/VITE_TURNSTILE_SITE_KEY/);
});
