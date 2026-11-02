import { defineConfig, devices } from "@playwright/test";

const desktop = { viewport: { width: 1440, height: 900 } };
/** The preview's port; set E2E_PORT when 4173 is taken by another server, which would otherwise be reused. */
const port = Number(process.env.E2E_PORT ?? 4173);

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "on-first-retry",
  },
  // The build served as the static host serves it: compressed, prerendered pages by path, and the 404 page with a
  // 404 status for paths it has no file for.
  webServer: {
    command: `node scripts/serve-compressed.mjs --port ${port}`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"], ...desktop } },
    { name: "firefox", use: { ...devices["Desktop Firefox"], ...desktop } },
    { name: "webkit", use: { ...devices["Desktop Safari"], ...desktop } },
    { name: "mobile-chrome", use: { ...devices["Pixel 7"] } },
    { name: "mobile-safari", use: { ...devices["iPhone 14"] } },
  ],
});
