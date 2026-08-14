import { test, expect } from "../support/fixtures";

const DAILY_DUE = {
  reminderSchedule: "daily",
  lastBackupDate: null,
  lastBackupMode: null,
  bannerLastShownDate: null,
};

test.describe("backup-reminder", () => {
  test("banner shows on a fresh profile, dismiss-persists across a fresh page", async ({
    page,
  }) => {
    // Registered after the fixture's own addInitScript, so it wins for THIS navigation —
    // "daily" (not "weekly") so the reminder is due unconditionally, not gated to Sundays.
    await page.addInitScript((prefs) => {
      localStorage.setItem("expense-tracker-backup-reminder", JSON.stringify(prefs));
    }, DAILY_DUE);
    await page.goto("/");

    await expect(page.getByText("Backup reminder")).toBeVisible();
    await expect(page.getByText("Your daily backup is due. Last backup: never.")).toBeVisible();

    await page.getByRole("button", { name: "Later" }).click();
    await expect(page.getByText("Backup reminder")).toHaveCount(0);

    // The banner's mount effect already stamped bannerLastShownDate=today in real localStorage.
    // Check a brand new page in the same context (no page-scoped addInitScript baggage) instead
    // of page.reload(), which would just re-run this test's own override and show it again.
    const freshPage = await page.context().newPage();
    await freshPage.goto("/");
    await expect(freshPage.getByText("Backup reminder")).toHaveCount(0);
    await freshPage.close();
  });

  test("Backup Now navigates to /settings/data", async ({ page }) => {
    await page.addInitScript((prefs) => {
      localStorage.setItem("expense-tracker-backup-reminder", JSON.stringify(prefs));
    }, DAILY_DUE);
    await page.goto("/");

    await page.getByRole("button", { name: "Backup Now" }).click();
    await expect(page).toHaveURL(/\/settings\/data$/);
  });

  test("setting the reminder Select to Never persists to localStorage", async ({ page }) => {
    await page.goto("/settings/data");

    const reminderSelect = page.getByRole("combobox");
    await reminderSelect.click();
    await page.getByRole("option", { name: "Daily" }).click();

    await reminderSelect.click();
    await page.getByRole("option", { name: "Never" }).click();

    const stored = await page.evaluate(() =>
      localStorage.getItem("expense-tracker-backup-reminder"),
    );
    expect(JSON.parse(stored ?? "{}").reminderSchedule).toBe("never");
  });
});
