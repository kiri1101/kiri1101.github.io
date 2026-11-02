/** Cloudflare's always-pass Turnstile site key: dev, tests and local builds use it. */
export const TURNSTILE_TEST_KEY = "1x00000000000000000000AA";

/**
 * The production widget's site key (jordan-tukum.pages.dev). It is public by design (it ships in the page), so it lives
 * here rather than in a dashboard variable that a Pages project with a wrangler config might not pass to the build.
 * The widget's secret is a Pages secret, never in the repo.
 */
export const TURNSTILE_SITE_KEY = "0x4AAAAAAFwYbtB16kQIbZ2D";

const isProductionDeploy = (env: Record<string, string | undefined>) =>
  env.CF_PAGES === "1" || env.REQUIRE_TURNSTILE_KEY === "1";

/**
 * The site key a build should bake in: an explicit VITE_TURNSTILE_SITE_KEY wins; a production deploy (Pages, or
 * REQUIRE_TURNSTILE_KEY=1) otherwise gets the production key; anything else gets nothing, so the site uses the test key.
 */
export function resolveTurnstileSiteKey(env: Record<string, string | undefined>): string | undefined {
  return env.VITE_TURNSTILE_SITE_KEY || (isProductionDeploy(env) ? TURNSTILE_SITE_KEY : undefined);
}

/**
 * Called by the production build (vite.config.ts) so a deploy can never ship the always-pass test key. It applies on
 * Cloudflare Pages (which sets CF_PAGES=1) or when REQUIRE_TURNSTILE_KEY=1; local builds, CI and e2e keep the test key.
 */
export function assertTurnstileKey(env: Record<string, string | undefined>): void {
  if (!isProductionDeploy(env)) return;
  const key = env.VITE_TURNSTILE_SITE_KEY;
  if (!key) {
    throw new Error(
      "Production build without a Turnstile site key: set VITE_TURNSTILE_SITE_KEY or TURNSTILE_SITE_KEY (app/lib/turnstile-key.ts) to the widget's public site key.",
    );
  }
  if (key === TURNSTILE_TEST_KEY) {
    throw new Error("VITE_TURNSTILE_SITE_KEY is Cloudflare's always-pass test key: use the real widget's public site key for a production build.");
  }
}
