import type { Page } from "@playwright/test";
import { test, expect } from "../support/fixtures";
import { gotoApp } from "../support/app";
import { seedExpenses } from "../support/db";
import { thisMonth3 } from "../support/data";

// The global chromium-desktop project blocks service workers by default; this spec needs one.
test.use({ serviceWorkers: "allow" });

const NEXT_BUILD = "/sw.js?e2e-next-build";

/** Seeds data under an active service worker, then fakes the next deploy: registering the same
 *  worker under a new script URL makes the browser install it as a fresh version and park it as
 *  "waiting" (prompt mode never skip-waits on its own) — the state a real redeploy produces, on any
 *  environment, from one deploy. Playwright can't route the browser's own sw.js update fetch, so
 *  serving a byte-modified sw.js isn't an option. */
async function bootWithPendingUpdate(page: Page) {
  await gotoApp(page, "/");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await seedExpenses(page, thisMonth3()); // reloads, so the active worker now controls the page
  await expect(page.getByText("₹4,000", { exact: true })).toBeVisible();

  await page.evaluate(async (url) => {
    await navigator.serviceWorker.register(url);
  }, NEXT_BUILD);
  await expect(page.getByText("New version available!")).toBeVisible();
}

test.describe("sw-update", { tag: "@smoke" }, () => {
  test("Update Now reloads onto the new version and keeps the data", async ({ page }) => {
    await bootWithPendingUpdate(page);

    const reloaded = page.waitForEvent("load");
    await page.getByRole("button", { name: "Update Now" }).click();
    await reloaded;

    const controller = await page.evaluate(() => navigator.serviceWorker.controller?.scriptURL);
    expect(controller).toContain(NEXT_BUILD);
    await expect(page.getByText("₹4,000", { exact: true })).toBeVisible();
  });

  test("a stalled update unlocks the prompt", async ({ page }) => {
    // Drop the skip-waiting message: the waiting worker never activates, so no reload comes.
    await page.addInitScript(() => {
      const post = ServiceWorker.prototype.postMessage;
      ServiceWorker.prototype.postMessage = function (this: ServiceWorker, ...args: unknown[]) {
        if ((args[0] as { type?: string } | null)?.type === "SKIP_WAITING") return;
        return Reflect.apply(post, this, args);
      };
    });
    await bootWithPendingUpdate(page);

    await page.getByRole("button", { name: "Update Now" }).click();
    await expect(page.getByRole("button", { name: "Updating..." })).toBeDisabled();
    await expect(page.getByText("Update failed. Close and reopen the app to update.")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole("button", { name: "Update Now" })).toBeEnabled();
    await expect(page.getByRole("button", { name: "Later" })).toBeEnabled();
  });
});
