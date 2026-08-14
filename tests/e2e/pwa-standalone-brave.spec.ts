import { test, expect } from "@playwright/test";
import { launchChromiumInstalledPwa, runInstalledPwaJourney } from "../support/installed-pwa";
import { BRAVE_PATH } from "../support/browsers";

test("Brave installed-PWA journey", async () => {
  test.skip(!BRAVE_PATH, "Brave not installed");

  const handle = await launchChromiumInstalledPwa(test.info().outputPath("brave-profile"), {
    executablePath: BRAVE_PATH,
  });
  try {
    // navigator.brave is Brave's own detection API — engine-specific proof this is not plain Chromium.
    expect(await handle.page.evaluate(() => "brave" in navigator)).toBe(true);
    await runInstalledPwaJourney(handle);
  } finally {
    await handle.context.close();
  }
});
