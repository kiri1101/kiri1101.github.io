import { readdirSync } from "node:fs";
import { expect, test } from "@playwright/test";

// What Cloudflare Pages does with a page request (verified against `npx wrangler pages dev build/client`): the build
// emits flat `<path>.html` pages, so the slashless URL answers 200 and the slash form redirects to it; unknown paths get
// the 404 page with a 404 status; public/_headers applies once. scripts/serve-compressed.mjs applies the same rules locally.
const asset = readdirSync("build/client/assets").find((f) => f.endsWith(".js"))!;

test.describe("hosting", () => {
  for (const [page, lang] of [["/projets/services-publics", "fr"], ["/en/projects/services-publics", "en"], ["/en", "en"]] as const) {
    test(`${page} answers at its slashless path with a 200 and no redirect; the slash and .html forms redirect to it (I1)`, async ({ request }) => {
      const ok = await request.get(page, { maxRedirects: 0 });
      expect(ok.status()).toBe(200);
      const html = await ok.text();
      expect(html).toContain('<link rel="canonical" href="https://');
      expect(html).toContain(`<html lang="${lang}"`);
      for (const form of [`${page}/`, `${page}.html`]) {
        const res = await request.get(form, { maxRedirects: 0 });
        expect([301, 302, 307, 308], form).toContain(res.status());
        expect(new URL(res.headers().location, "http://x").pathname, form).toBe(page);
      }
    });
  }

  test("an unknown path gets its language's 404 page with a 404 status: the nearest 404.html", async ({ request }) => {
    for (const path of ["/no-such-page", "/projets/no-such-project", "/projets/services-publics/nope", "/work/services-publics"]) {
      const res = await request.get(path, { maxRedirects: 0 });
      expect(res.status(), path).toBe(404);
      const html = await res.text();
      expect(html, path).toContain("Page introuvable");
      expect(html, path).toContain('<html lang="fr"');
    }
    for (const path of ["/en/nope", "/en/projects/no-such-project", "/en/projects/services-publics/nope"]) {
      const res = await request.get(path, { maxRedirects: 0 });
      expect(res.status(), path).toBe(404);
      const html = await res.text();
      expect(html, path).toContain("Page not found");
      expect(html, path).toContain('<html lang="en"');
    }
  });

  for (const path of ["/", "/en", "/projets/services-publics", "/en/projects/services-publics", "/no-such-page", "/en/nope"]) {
    test(`security headers on ${path} (I4)`, async ({ request }) => {
      const h = (await request.get(path, { maxRedirects: 0 })).headers();
      expect(h["x-content-type-options"]).toBe("nosniff");
      expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
      expect(h["x-frame-options"]).toBe("DENY");
      expect(h["content-security-policy"]).toBe("frame-ancestors 'none'");
      expect(h["permissions-policy"]).toContain("camera=()");
    });
  }

  test("fingerprinted assets are cached as immutable, and carry the security headers too", async ({ request }) => {
    const h = (await request.get(`/assets/${asset}`, { maxRedirects: 0 })).headers();
    expect(h["cache-control"]).toBe("public, max-age=31536000, immutable");
    expect(h["x-content-type-options"]).toBe("nosniff");
  });

  test("_headers is not served", async ({ request }) => {
    expect((await request.get("/_headers", { maxRedirects: 0 })).status()).toBe(404);
  });
});
