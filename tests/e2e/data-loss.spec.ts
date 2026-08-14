import { test, expect } from "../support/fixtures";
import { DEFAULT_CATEGORY_NAMES } from "../support/app";

const INSTALL_MARKER_WITH_HISTORY = {
  installedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  lastSeenAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  lastSeenExpenseCount: 5,
};

test.describe("data-loss", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((marker) => {
      localStorage.setItem("expense-tracker-install", JSON.stringify(marker));
    }, INSTALL_MARKER_WITH_HISTORY);
    // Not gotoApp: initializeDatabase() skips category seeding on the data-loss branch, so the
    // "categories > 0" boot signal never fires here. The dialog itself is the readiness signal.
    await page.goto("/");
  });

  test("dialog appears on an otherwise-fresh profile and mentions the lost count", async ({
    page,
  }) => {
    const dialog = page.getByRole("alertdialog");
    await expect(dialog.getByText("Data missing")).toBeVisible();
    await expect(dialog.getByText(/previously held.*5.*expenses/s)).toBeVisible();
  });

  test("Escape and backdrop clicks do not dismiss the dialog", async ({ page }) => {
    const dialog = page.getByRole("alertdialog");
    await expect(dialog.getByText("Data missing")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(dialog).toBeVisible();

    await page.mouse.click(5, 5);
    await expect(dialog).toBeVisible();
  });

  test("Start fresh closes the dialog and reseeds the default categories", async ({ page }) => {
    const dialog = page.getByRole("alertdialog");
    await expect(dialog.getByText("Data missing")).toBeVisible();
    await dialog.getByRole("button", { name: "Start fresh" }).click();
    await expect(dialog).toHaveCount(0);

    // "Start fresh" triggers initializeDatabase() fire-and-forget (not awaited by the click
    // handler) — wait for its bulkAdd to actually commit before navigating, otherwise the
    // /categories hard navigation can race the reseed.
    await page.waitForFunction(
      () =>
        new Promise<boolean>((resolve) => {
          const req = indexedDB.open("ExpenseTrackerDB");
          req.onerror = () => resolve(false);
          req.onsuccess = () => {
            const db = req.result;
            const tx = db.transaction("categories", "readonly");
            const countReq = tx.objectStore("categories").count();
            countReq.onsuccess = () => {
              db.close();
              resolve(countReq.result > 0);
            };
            countReq.onerror = () => {
              db.close();
              resolve(false);
            };
          };
        }),
      { timeout: 15_000 },
    );

    await page.goto("/categories");
    for (const name of DEFAULT_CATEGORY_NAMES) {
      await expect(page.getByText(name, { exact: true })).toBeVisible();
    }
  });

  test("Restore from backup navigates to /settings/data", async ({ page }) => {
    const dialog = page.getByRole("alertdialog");
    await expect(dialog.getByText("Data missing")).toBeVisible();
    await dialog.getByRole("button", { name: "Restore from backup" }).click();
    await expect(page).toHaveURL(/\/settings\/data$/);
  });
});
