import { test } from "@playwright/test";
import { launchChromiumInstalledPwa, runInstalledPwaJourney } from "../support/installed-pwa";
import { CHROME_INSTALLED } from "../support/browsers";

// No engine marker: the standalone recipe is the same Chromium mechanism validated end to end
// on Brave — inferred, not independently re-verified, to hold for this channel.
test("Chrome installed-PWA journey", async () => {
  test.skip(!CHROME_INSTALLED, "Chrome not installed");

  const handle = await launchChromiumInstalledPwa(test.info().outputPath("chrome-profile"), {
    channel: "chrome",
  });
  try {
    await runInstalledPwaJourney(handle);
  } finally {
    await handle.context.close();
  }
});
