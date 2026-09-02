import type { Page } from "@playwright/test";
import { test, expect } from "../support/fixtures";
import { gotoApp, daysAgo, readDownload, DEFAULT_CATEGORY_NAMES } from "../support/app";
import { seedExpenses } from "../support/db";
import { thisMonth3 } from "../support/data";

async function setPassphrase(page: Page, passphrase: string) {
  await page.getByRole("button", { name: "Set Passphrase" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Passphrase", { exact: true }).fill(passphrase);
  await dialog.getByLabel("Confirm Passphrase").fill(passphrase);
  await dialog.getByRole("button", { name: "Set Passphrase" }).click();
  await expect(page.getByText("Encryption passphrase saved")).toBeVisible();
}

/** Set a passphrase, take an encrypted export, return its contents. Leaves the page on /settings/data. */
async function exportEncrypted(page: Page, passphrase: string): Promise<string> {
  await setPassphrase(page, passphrase);
  await page.getByRole("button", { name: "Export Data" }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Encrypt this export").click();
  const downloadPromise = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Export Data" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^extrack-export-\d{4}-\d{2}-\d{2}\.extrack$/);
  return readDownload(download);
}

test.describe("data-management", () => {
  test("plain JSON export", { tag: "@smoke" }, async ({ page }) => {
    await gotoApp(page, "/settings/data");
    await seedExpenses(page, thisMonth3());

    await page.getByRole("button", { name: "Export Data" }).first().click();
    const dialog = page.getByRole("dialog");
    const downloadPromise = page.waitForEvent("download");
    await dialog.getByRole("button", { name: "Export Data" }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/^extrack-export-\d{4}-\d{2}-\d{2}\.json$/);

    const json = JSON.parse(await readDownload(download));
    expect(json.expenses).toHaveLength(3);
    expect(json.categories).toHaveLength(7);
    expect(json.expenses[0]).toHaveProperty("id");
    expect(json.expenses[0]).toHaveProperty("value");
    expect(json.expenses[0]).toHaveProperty("category");
    expect(json.expenses[0]).toHaveProperty("date");
    expect(json.categories[0]).toHaveProperty("name");
  });

  test("CSV export has the documented header", async ({ page }) => {
    await gotoApp(page, "/settings/data");
    await seedExpenses(page, thisMonth3());

    await page.getByRole("button", { name: "Export Data" }).first().click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "CSV" }).click();
    const downloadPromise = page.waitForEvent("download");
    await dialog.getByRole("button", { name: "Export Data" }).click();
    const download = await downloadPromise;

    const csv = await readDownload(download);
    const header = csv.split("\n")[0];
    expect(header).toBe("Date,Time,Category,Description,Value,Tags,IsAdhoc,Attachment");
  });

  test("passphrase setup: mismatch validation then success", async ({ page }) => {
    await gotoApp(page, "/settings/data");

    await page.getByRole("button", { name: "Set Passphrase" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Passphrase", { exact: true }).fill("correcthorse123");
    await dialog.getByLabel("Confirm Passphrase").fill("different123");
    await expect(dialog.getByText("Passphrases do not match")).toBeVisible();

    await dialog.getByLabel("Confirm Passphrase").fill("correcthorse123");
    await dialog.getByRole("button", { name: "Set Passphrase" }).click();
    await expect(page.getByText("Encryption passphrase saved")).toBeVisible();

    await page.reload();
    await expect(page.getByRole("button", { name: "Set Passphrase" })).toHaveCount(0);
    await expect(page.getByLabel("Change passphrase")).toBeVisible();
  });

  test("encrypted round trip: export, factory reset, merge import", async ({ page }) => {
    await gotoApp(page, "/settings/data");
    await seedExpenses(page, thisMonth3());
    const backupContent = await exportEncrypted(page, "correcthorse123");

    // Factory reset wipes data, categories, and the stored passphrase.
    await page.getByRole("button", { name: "Factory Reset" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Confirm Reset" }).click();
    await expect(page.getByText("All data cleared. App reset to default state.")).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText("No expenses yet. Add your first one!")).toBeVisible();

    // Import the encrypted backup back in — passphrase was cleared, so manual entry is required.
    // A safety-copy snapshot survives the reset (that's the point of Tier 1), so the restore
    // offer dialog pops up on this empty-list foreground — decline it to continue with the
    // deliberate manual import this test is exercising.
    await page.goto("/settings/data");
    await page.getByRole("alertdialog").getByRole("button", { name: "Start fresh" }).click();
    await page.setInputFiles('[data-testid="import-file-input"]', {
      name: "backup.extrack",
      mimeType: "application/octet-stream",
      buffer: Buffer.from(backupContent, "utf-8"),
    });
    await page.getByLabel("Passphrase").fill("correcthorse123");
    await page.getByRole("button", { name: "Decrypt" }).click();

    await page.getByLabel("Merge (Safe)").check();
    await page.getByRole("button", { name: "Confirm Import" }).click();
    await expect(page.getByText("Data imported successfully")).toBeVisible();

    await page.goto("/transactions");
    await expect(page.getByText("Showing 3 transactions")).toBeVisible();
  });

  test("rejects a non-encrypted file renamed .extrack", async ({ page }) => {
    await gotoApp(page, "/settings/data");
    await page.setInputFiles('[data-testid="import-file-input"]', {
      name: "fake.extrack",
      mimeType: "application/octet-stream",
      buffer: Buffer.from('{"foo":1}', "utf-8"),
    });
    await expect(
      page.getByText("Only encrypted .extrack backup files can be imported"),
    ).toBeVisible();
  });

  test("wrong manual passphrase is rejected", async ({ page }) => {
    await gotoApp(page, "/settings/data");
    await seedExpenses(page, thisMonth3());
    const backupContent = await exportEncrypted(page, "correcthorse123");

    await page.getByRole("button", { name: "Factory Reset" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Confirm Reset" }).click();
    await expect(page.getByText("All data cleared. App reset to default state.")).toBeVisible();

    await page.goto("/settings/data");
    await page.getByRole("alertdialog").getByRole("button", { name: "Start fresh" }).click();
    await page.setInputFiles('[data-testid="import-file-input"]', {
      name: "backup.extrack",
      mimeType: "application/octet-stream",
      buffer: Buffer.from(backupContent, "utf-8"),
    });
    await page.getByLabel("Passphrase").fill("wrong-passphrase");
    await page.getByRole("button", { name: "Decrypt" }).click();
    await expect(page.getByText("Wrong passphrase — try again")).toBeVisible();
  });

  test("override mode replaces existing data entirely", async ({ page }) => {
    await gotoApp(page, "/settings/data");
    await seedExpenses(page, thisMonth3());
    const backupContent = await exportEncrypted(page, "correcthorse123");

    await page.goto("/");
    await seedExpenses(page, [
      { value: 999, categoryName: "Others", description: "Should be gone", date: daysAgo(0), time: "09:00" },
    ]);

    await page.goto("/settings/data");
    await page.setInputFiles('[data-testid="import-file-input"]', {
      name: "backup.extrack",
      mimeType: "application/octet-stream",
      buffer: Buffer.from(backupContent, "utf-8"),
    });
    await page.getByLabel("Override (Destructive)").check();
    await page.getByRole("button", { name: "Confirm Import" }).click();
    await expect(page.getByText("Data imported successfully")).toBeVisible();

    await page.goto("/transactions");
    await expect(page.getByText("Showing 3 transactions")).toBeVisible();
    await expect(page.getByText("Should be gone")).toHaveCount(0);
  });

  test("factory reset clears everything", { tag: "@smoke" }, async ({ page }) => {
    await gotoApp(page, "/settings/data");
    await seedExpenses(page, thisMonth3());

    await page.getByRole("button", { name: "Factory Reset" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Confirm Reset" }).click();

    await expect(page.getByText("All data cleared. App reset to default state.")).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText("No expenses yet. Add your first one!")).toBeVisible();

    await page.goto("/categories");
    for (const name of DEFAULT_CATEGORY_NAMES) {
      await expect(page.getByText(name, { exact: true })).toBeVisible();
    }
  });
});
