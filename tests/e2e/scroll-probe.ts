/**
 * The page's test-only scroll probe (`window.__orbitProbe`, read once by app/hooks/useScrollPhases.ts when the scroll
 * loop starts), set with `addInitScript` so it is in place before any page script runs. Production never sets it, and
 * without it the page writes nothing for tests.
 */
import type { Page } from "@playwright/test";

/**
 * Turns the probe on: the scroll loop then writes its eased P, the position the layers follow, to `window.__orbitP`
 * on every frame. For tests that sample the layers where they are, not where the scroll position leads them.
 */
export async function scrollProbe(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.__orbitProbe = true;
  });
}
