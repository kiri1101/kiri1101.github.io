import { reactRouter } from "@react-router/dev/vite";
import { defineConfig, loadEnv } from "vite";
import { assertTurnstileKey, resolveTurnstileSiteKey } from "./app/lib/turnstile-key.ts";

export default defineConfig(({ command, mode }) => {
  const env = { ...process.env, ...loadEnv(mode, process.cwd(), "VITE_") };
  // On a production deploy the real Turnstile site key is baked in (app/lib/turnstile-key.ts); elsewhere the site keeps
  // Cloudflare's test key. Vite exposes VITE_* variables found in process.env to import.meta.env.
  const siteKey = resolveTurnstileSiteKey(env);
  if (siteKey) process.env.VITE_TURNSTILE_SITE_KEY = siteKey;
  // A production build on Pages (or with REQUIRE_TURNSTILE_KEY=1) must carry the real Turnstile site key.
  if (command === "build") assertTurnstileKey({ ...env, VITE_TURNSTILE_SITE_KEY: siteKey });
  return {
    plugins: [reactRouter()],
    resolve: {
      tsconfigPaths: true,
    },
    build: {
      // The one chunk above Vite's 500 kB default is the lazily imported three.js scene (~550 kB, ~135 kB gzip).
      // The real budget is `npm run check:bundle`: first-route JS only, with three.js kept out of it.
      chunkSizeWarningLimit: 600,
    },
    worker: {
      // A module worker, so its scene chunk (three.js) is a separate file it imports only once the hardware check
      // passes; the worker's entry stays small.
      format: "es",
    },
  };
});
