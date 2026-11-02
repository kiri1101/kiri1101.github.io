/**
 * The page's test-only scene switch (`window.__orbitSceneTest`, read by app/hooks/useScene.ts), set with
 * `addInitScript` so it is in place before any page script runs. Production never sets it.
 */
import { expect, type Page, type TestInfo } from "@playwright/test";

/** Keeps the 3D scene out, for tests about the DOM layers: the page stays on its poster everywhere. */
export async function sceneOff(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.__orbitSceneTest = "off";
  });
}

/**
 * Lets the scene run on software WebGL. Headless Chromium only has SwiftShader, which the page otherwise
 * refuses (failIfMajorPerformanceCaveat), so without this it would stay on the poster there.
 */
export async function allowSoftwareGL(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.__orbitSceneTest = "allow-software-gl";
  });
}

/**
 * For `afterEach` in a DOM spec: the switch held and the page settled on its poster, so the test never waited on
 * WebGL frames. Skipped tests, pages never loaded and pages without JavaScript have nothing to check.
 */
export async function expectSceneOff(
  { page, javaScriptEnabled }: { page: Page; javaScriptEnabled: boolean },
  testInfo: TestInfo,
): Promise<void> {
  if (testInfo.status === "skipped" || !javaScriptEnabled || page.url() === "about:blank") return;
  await expect(page.locator("#scene")).toHaveAttribute("data-scene", "off");
}
