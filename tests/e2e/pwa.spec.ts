import { test, expect } from "../support/fixtures";
import { gotoApp } from "../support/app";

// The global chromium-desktop project blocks service workers by default; this spec needs one.
test.use({ serviceWorkers: "allow" });

test.describe("pwa", () => {
  test("service worker registers", async ({ page }) => {
    await gotoApp(page, "/");
    await page.evaluate(() => navigator.serviceWorker.ready);
    const count = await page.evaluate(
      async () => (await navigator.serviceWorker.getRegistrations()).length,
    );
    expect(count).toBeGreaterThan(0);
  });

  test("manifest matches the shipped contract, and its icons and theme-color resolve", async ({ page }) => {
    await gotoApp(page, "/");
    const manifestHref = await page.locator('link[rel="manifest"]').getAttribute("href");
    expect(manifestHref).toBe("/site.webmanifest");

    const res = await page.request.get(manifestHref!);
    expect(res.status()).toBe(200);
    const manifest = await res.json();
    expect(manifest.name).toBe("Private Expense Tracker");
    expect(manifest.short_name).toBe("ExTrack");
    expect(manifest.start_url).toBe("/");
    expect(manifest.display).toBe("standalone");
    expect(manifest.background_color).toBe("#090C17");
    expect(manifest.icons).toHaveLength(4);

    for (const icon of manifest.icons as { src: string }[]) {
      const iconRes = await page.request.get(icon.src);
      expect(iconRes.status(), icon.src).toBe(200);
      expect(iconRes.headers()["content-type"], icon.src).toBe("image/png");
    }

    const metas = await page.locator('meta[name="theme-color"]').all();
    expect(metas.length).toBeGreaterThan(0);
    for (const meta of metas) {
      expect(await meta.getAttribute("content")).toBe(manifest.theme_color);
    }
  });

  test.describe("offline", () => {
    // Some non-precached resource (e.g. analytics) legitimately fails while offline — not a
    // regression in the app under test.
    test.use({ consoleErrorAllowlist: [/net::ERR_INTERNET_DISCONNECTED/] });

    test("offline reload still renders the shell via the Workbox precache", async ({
      page,
      context,
    }) => {
      await gotoApp(page, "/");
      await page.evaluate(() => navigator.serviceWorker.ready);
      // First load registers the worker but doesn't hand it control; one more (online) reload
      // lets the now-active worker take over before we cut the network.
      await page.reload();
      await page.evaluate(() => navigator.serviceWorker.ready);

      await context.setOffline(true);
      await page.reload();
      await expect(page.getByText("No expenses yet. Add your first one!")).toBeVisible();
      await context.setOffline(false);
    });
  });
});
