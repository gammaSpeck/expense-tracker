import { chromium, webkit, devices, expect, type BrowserContext, type Page } from "@playwright/test";
import { BASE_URL } from "./env";
import { installHarness } from "./app";

const PIXEL_5 = devices["Pixel 5"];
const IPHONE_14 = devices["iPhone 14"];

/** Chromium mobile viewport WITHOUT `isMobile`. Confirmed this session: `isMobile: true`
 *  forces `display-mode: browser` even under `--app`, independent of viewport size; every
 *  other Pixel 5 field (viewport, userAgent, hasTouch, deviceScaleFactor) is compatible
 *  with standalone mode. Never spread the full `devices["Pixel 5"]` object here. */
const CHROMIUM_APP_MOBILE_CONTEXT = {
  viewport: PIXEL_5.viewport,
  userAgent: PIXEL_5.userAgent,
  hasTouch: true,
  deviceScaleFactor: PIXEL_5.deviceScaleFactor,
};

export type InstalledPwaHandle = {
  context: BrowserContext;
  page: Page;
  /** WebKit skips two steps of the journey — see `launchWebkitInstalledPwa`. */
  isWebkit: boolean;
};

/** Chromium-family launcher (Brave via executablePath, Chrome via channel) — same recipe both times. */
export async function launchChromiumInstalledPwa(
  userDataDir: string,
  browserRef: { executablePath?: string; channel?: string },
): Promise<InstalledPwaHandle> {
  const context = await chromium.launchPersistentContext(userDataDir, {
    ...browserRef,
    headless: true,
    args: ["--no-first-run", "--no-default-browser-check", `--app=${BASE_URL}/`],
    ...CHROMIUM_APP_MOBILE_CONTEXT,
    serviceWorkers: "allow",
  });
  const page = context.pages()[0] ?? (await context.waitForEvent("page"));
  await installHarness(context);
  await page.goto(`${BASE_URL}/`); // the --app navigation already happened at launch; route/init script only apply after this explicit goto
  return { context, page, isWebkit: false };
}

/** WebKit has no `--app`-equivalent — confirmed empirically, never attempt it. Uses the
 *  full stock `devices["iPhone 14"]` descriptor (its `isMobile: true` causes no regression
 *  here, unlike Chromium, because there is no standalone mode to break).
 *
 *  `isWebkit: true` also skips the journey's offline-reload step: two independent mitigations
 *  were tried and both fail on this build — `context.setOffline` + `reload()` throws "WebKit
 *  encountered an internal error", and blocking all requests via `context.route` instead throws
 *  "Blocked by Web Inspector" because it aborts the navigation request before the service
 *  worker's fetch handler sees it. An upstream Playwright/WebKit driver limitation, not an app
 *  defect — same class of ceiling as WebKit never reaching display-mode: standalone. */
export async function launchWebkitInstalledPwa(userDataDir: string): Promise<InstalledPwaHandle> {
  const context = await webkit.launchPersistentContext(userDataDir, {
    headless: true,
    ...IPHONE_14,
    serviceWorkers: "allow",
  });
  const page = context.pages()[0] ?? (await context.waitForEvent("page"));
  await installHarness(context);
  await page.goto(`${BASE_URL}/`);
  return { context, page, isWebkit: true };
}

/** The one journey run by all three specs. Confirmed this session end to end against
 *  production on the Brave recipe: standalone true, FAB visible via isVisible() (NOT
 *  offsetParent — position:fixed elements report offsetParent===null in Blink), tap
 *  navigates to /add. */
export async function runInstalledPwaJourney(handle: InstalledPwaHandle) {
  const { page, isWebkit } = handle;

  const errors: string[] = [];
  page.on("console", (msg) => {
    // Step 5 intentionally cuts the network; a non-precached resource failing there is expected.
    if (msg.type() === "error" && !msg.text().includes("ERR_INTERNET_DISCONNECTED")) {
      errors.push(`console.error: ${msg.text()}`);
    }
  });
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));

  // 1. Prove the harness — or every assertion below is silently meaningless.
  if (!isWebkit) {
    const standalone = await page.evaluate(() => matchMedia("(display-mode: standalone)").matches);
    expect(standalone, "installed-PWA harness did not engage").toBe(true);
  }

  // 2. Mobile layout, no browser chrome: FAB + BottomNav reachable.
  const fab = page.getByLabel("Add expense");
  await expect(fab).toBeVisible();
  await expect(page.getByRole("link", { name: "Home" }).first()).toBeVisible();

  // 3. Full add-expense journey via the FAB (locator.tap(), not click — real touch input).
  await fab.tap();
  await expect(page).toHaveURL(/\/add$/);
  await page.getByLabel("Amount").fill("42");
  await page.getByLabel("Description (optional)").fill("Installed PWA journey");
  const saveButton = page.getByRole("button", { name: "Save" });
  await saveButton.tap();
  await expect(page.getByText("Expense added")).toBeVisible();
  await expect(page).toHaveURL(`${BASE_URL}/`);
  await expect(page.getByTestId("expense-card").filter({ hasText: "Installed PWA journey" })).toBeVisible();

  // 4. Service worker registers.
  const swCount = await page.evaluate(() =>
    navigator.serviceWorker.getRegistrations().then((r) => r.length),
  );
  expect(swCount).toBeGreaterThan(0);

  // 5. Offline reload still renders the shell; data survives a reload. Skipped where the
  // engine's own Playwright driver can't sustain it (see isWebkit's doc comment).
  if (!isWebkit) {
    await handle.context.setOffline(true);
    await page.reload();
    await expect(page.getByTestId("expense-card").filter({ hasText: "Installed PWA journey" })).toBeVisible();
    await handle.context.setOffline(false);
  }

  expect(errors, `unexpected console/page errors:\n${errors.join("\n")}`).toEqual([]);
}
