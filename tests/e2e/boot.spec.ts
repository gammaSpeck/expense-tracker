import { test, expect } from "../support/fixtures";
import { gotoApp, DEFAULT_CATEGORY_NAMES } from "../support/app";
import { E2E_ENV } from "../support/env";

test.describe("boot", { tag: "@smoke" }, () => {
  test("boots with the seeded empty state", async ({ page }) => {
    await gotoApp(page, "/");
    await expect(page.getByText("No expenses yet. Add your first one!")).toBeVisible();
  });

  test("/categories lists exactly the 7 default categories", async ({ page }) => {
    await gotoApp(page, "/categories");
    for (const name of DEFAULT_CATEGORY_NAMES) {
      await expect(page.getByText(name, { exact: true })).toBeVisible();
    }
  });

  test("environment fingerprint at /settings/about", async ({ page }) => {
    await gotoApp(page, "/settings/about");
    const versionText = page.getByText(/^Version v/);
    await expect(versionText).toBeVisible();
    const suffix = E2E_ENV === "local" ? "localhost" : E2E_ENV;
    const pattern =
      E2E_ENV === "production"
        ? /^Version v\d+\.\d+\.\d+$/
        : new RegExp(`^Version v\\d+\\.\\d+\\.\\d+\\.${suffix}$`);
    await expect(versionText).toHaveText(pattern);
  });

  test("SPA deep-link survives a direct navigation", async ({ page }) => {
    const response = await page.goto("/transactions");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: "All Transactions" })).toBeVisible();
  });

  test.describe("404 route", () => {
    // NotFound.tsx intentionally logs console.error for every unknown route hit — not a bug.
    test.use({ consoleErrorAllowlist: [/404 Error: User attempted to access non-existent route/] });

    test("unknown route renders NotFound and the shell survives", async ({ page }) => {
      await page.goto("/no-such-route");
      await expect(page.getByText("404")).toBeVisible();
      await expect(page.getByText("Oops! Page not found")).toBeVisible();
    });
  });
});
