import { test } from "@playwright/test";
import { launchWebkitInstalledPwa, runInstalledPwaJourney } from "../support/installed-pwa";

// No skip guard: WebKit is a standard Playwright-managed browser, always installed.
// Named "WebKit", not "Safari": Playwright's webkit build is Apple's engine, not the real
// Safari.app — this proves nothing about actual Safari-specific behavior. Named "PWA journey",
// not "installed-PWA journey": WebKit never reaches display-mode: standalone (no --app
// equivalent) and skips the offline-reload check — see runInstalledPwaJourney's isWebkit
// branches — so "installed" would overclaim what this path actually covers.
test("WebKit mobile PWA journey", async () => {
  const handle = await launchWebkitInstalledPwa(test.info().outputPath("webkit-profile"));
  try {
    await runInstalledPwaJourney(handle);
  } finally {
    await handle.context.close();
  }
});
