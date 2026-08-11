import { test } from "@playwright/test";
import { launchWebkitInstalledPwa, runInstalledPwaJourney } from "../support/installed-pwa";

// No skip guard: WebKit is a standard Playwright-managed browser, always installed.
test("Safari (WebKit) installed-PWA journey", async () => {
  const handle = await launchWebkitInstalledPwa(test.info().outputPath("safari-profile"));
  try {
    await runInstalledPwaJourney(handle);
  } finally {
    await handle.context.close();
  }
});
