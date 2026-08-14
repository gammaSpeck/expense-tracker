import { defineConfig, devices } from "@playwright/test";
import { BASE_URL, IS_LOCAL_SERVER } from "./tests/support/env";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,
  timeout: 30_000,
  expect: { timeout: 7_000 },
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }], ["list"]]
    : [["list"]],
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    video: "retain-on-failure",
    screenshot: "only-on-failure",
    serviceWorkers: "block",
    testIdAttribute: "data-testid",
  },
  projects: [
    {
      name: "chromium-desktop",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: /pwa-standalone-.*\.spec\.ts/,
    },
    { name: "brave-mobile-pwa", testMatch: /pwa-standalone-brave\.spec\.ts/ },
    { name: "chrome-mobile-pwa", testMatch: /pwa-standalone-chrome\.spec\.ts/ },
    { name: "safari-mobile-pwa", testMatch: /pwa-standalone-safari\.spec\.ts/ },
  ],
  webServer: IS_LOCAL_SERVER
    ? {
        command: "bunx vite build && bunx vite preview --port 4173 --strictPort",
        url: "http://localhost:4173",
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      }
    : undefined,
});
