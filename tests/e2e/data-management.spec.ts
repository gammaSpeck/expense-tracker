import type { Page } from "@playwright/test";
import { randomBytes } from "node:crypto";
import { test, expect } from "../support/fixtures";
import { gotoApp, daysAgo, readDownload, DEFAULT_CATEGORY_NAMES } from "../support/app";
import { seedExpenses } from "../support/db";
import { thisMonthWithAdhoc } from "../support/data";
import { MAX_RESTORE_FILE_BYTES } from "../../src/config/limits";

const RESTORE_MARKER_KEY = "expense-tracker-restore-in-progress";
const UNFINISHED_RESTORE_TOAST = "Your last restore didn't finish";

declare global {
  interface Window {
    __decryptStarted?: boolean;
    __decryptDone?: boolean;
    __releaseDecrypt?: () => void;
  }
}

async function setPassphrase(page: Page, passphrase: string) {
  await page.getByRole("button", { name: "Set Passphrase" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Passphrase", { exact: true }).fill(passphrase);
  await dialog.getByLabel("Confirm Passphrase").fill(passphrase);
  await dialog.getByRole("button", { name: "Set Passphrase" }).click();
  await expect(page.getByText("Encryption passphrase saved")).toBeVisible();
}

/** Set a passphrase, run Create Backup → Save to device, return the file's contents. Leaves the page on /settings/data. */
async function backupToDevice(page: Page, passphrase: string): Promise<string> {
  await setPassphrase(page, passphrase);
  await page.getByRole("button", { name: "Create Backup" }).first().click();
  const dialog = page.getByRole("dialog", { name: "Backup" });
  const downloadPromise = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Create Backup" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^extrack-backup-\d{4}-\d{2}-\d{2}\.extrack$/);
  return readDownload(download);
}

test.describe("data-management", () => {
  test("plain JSON export", { tag: "@smoke" }, async ({ page }) => {
    await gotoApp(page, "/settings/data");
    await seedExpenses(page, thisMonthWithAdhoc());

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
    await seedExpenses(page, thisMonthWithAdhoc());

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

  test("encrypted round trip: backup, factory reset, merge import", async ({ page }) => {
    await gotoApp(page, "/settings/data");
    await seedExpenses(page, thisMonthWithAdhoc());
    const backupContent = await backupToDevice(page, "correcthorse123");

    // Factory reset wipes data, categories, and the stored passphrase.
    await page.getByRole("button", { name: "Factory Reset" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Confirm Reset" }).click();
    await expect(page.getByText("All data cleared. App reset to default state.")).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText("No expenses yet. Add your first one!")).toBeVisible();

    // Import the encrypted backup back in — passphrase was cleared, so manual entry is required.
    await page.goto("/settings/data");
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
    expect(await page.evaluate((key) => localStorage.getItem(key), RESTORE_MARKER_KEY)).toBeNull();

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
    await seedExpenses(page, thisMonthWithAdhoc());
    const backupContent = await backupToDevice(page, "correcthorse123");

    await page.getByRole("button", { name: "Factory Reset" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Confirm Reset" }).click();
    await expect(page.getByText("All data cleared. App reset to default state.")).toBeVisible();

    await page.goto("/settings/data");
    await page.setInputFiles('[data-testid="import-file-input"]', {
      name: "backup.extrack",
      mimeType: "application/octet-stream",
      buffer: Buffer.from(backupContent, "utf-8"),
    });
    await page.getByLabel("Passphrase").fill("wrong-passphrase");
    await page.getByRole("button", { name: "Decrypt" }).click();
    await expect(page.getByText("Wrong passphrase — try again")).toBeVisible();
  });

  test("restore skips invalid records and says why", async ({ page }) => {
    await gotoApp(page, "/settings/data");
    await seedExpenses(page, [
      ...thisMonthWithAdhoc(),
      { value: 9, categoryName: "Others", description: "Broken", date: "", time: "10:00" },
    ]);
    const backupContent = await backupToDevice(page, "correcthorse123");

    await page.getByRole("button", { name: "Factory Reset" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Confirm Reset" }).click();
    await expect(page.getByText("All data cleared. App reset to default state.")).toBeVisible();

    await page.goto("/settings/data");
    await page.setInputFiles('[data-testid="import-file-input"]', {
      name: "backup.extrack",
      mimeType: "application/octet-stream",
      buffer: Buffer.from(backupContent, "utf-8"),
    });
    await page.getByLabel("Passphrase").fill("correcthorse123");
    await page.getByRole("button", { name: "Decrypt" }).click();

    await expect(page.getByText("3 expenses")).toBeVisible();
    await expect(page.getByText("⚠️ 1 invalid record will be skipped (bad date)")).toBeVisible();
    await page.getByRole("button", { name: "Confirm Import" }).click();
    await expect(page.getByText("Data imported successfully")).toBeVisible();

    await page.goto("/transactions");
    await expect(page.getByText("Showing 3 transactions")).toBeVisible();
  });

  test("Cancel during decrypt shows no preview afterwards", async ({ page }) => {
    await gotoApp(page, "/settings/data");
    await seedExpenses(page, thisMonthWithAdhoc());
    const backupContent = await backupToDevice(page, "correcthorse123");

    await page.getByRole("button", { name: "Factory Reset" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Confirm Reset" }).click();
    await expect(page.getByText("All data cleared. App reset to default state.")).toBeVisible();

    // Hold AES-GCM decryption until the test releases it, so Cancel lands while it is in flight.
    await page.addInitScript(() => {
      const decrypt = crypto.subtle.decrypt.bind(crypto.subtle);
      const gate = Promise.withResolvers<void>();
      window.__releaseDecrypt = () => gate.resolve();
      crypto.subtle.decrypt = async (...args: Parameters<SubtleCrypto["decrypt"]>) => {
        window.__decryptStarted = true;
        await gate.promise;
        const plaintext = await decrypt(...args);
        window.__decryptDone = true;
        return plaintext;
      };
    });
    await page.goto("/settings/data");
    await page.setInputFiles('[data-testid="import-file-input"]', {
      name: "backup.extrack",
      mimeType: "application/octet-stream",
      buffer: Buffer.from(backupContent, "utf-8"),
    });
    await page.getByLabel("Passphrase").fill("correcthorse123");
    await page.getByRole("button", { name: "Decrypt" }).click();
    await page.waitForFunction(() => window.__decryptStarted === true);
    await page.getByRole("button", { name: "Cancel" }).click();
    await page.evaluate(() => window.__releaseDecrypt?.());
    await page.waitForFunction(() => window.__decryptDone === true);
    await page.waitForTimeout(500); // give an unguarded late result time to render

    await expect(page.getByText("Import Preview")).toHaveCount(0);
    await expect(page.locator('[data-testid="import-file-input"]')).toBeAttached();
  });

  test('"Back up now" opens the backup dialog exactly once', async ({ page }) => {
    await gotoApp(page, "/settings/data");
    await setPassphrase(page, "correcthorse123");

    await page.getByTestId("csv-import-entry").click();
    await page.getByRole("button", { name: "Back up now" }).click();
    await expect(page).toHaveURL(/\/settings\/data$/);
    const dialog = page.getByRole("dialog", { name: "Backup" });
    await expect(dialog).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await dialog.getByRole("button", { name: "Create Backup" }).click();
    await downloadPromise;
    await expect(page.getByText("Backup saved to device")).toBeVisible();
    await page.waitForTimeout(1000);
    await expect(dialog).toHaveCount(0);

    await page.reload();
    await expect(page.getByRole("heading", { name: "Data Management" })).toBeVisible();
    await page.waitForTimeout(1000);
    await expect(dialog).toHaveCount(0);
  });

  test("override mode replaces existing data entirely", async ({ page }) => {
    await gotoApp(page, "/settings/data");
    await seedExpenses(page, thisMonthWithAdhoc());
    const backupContent = await backupToDevice(page, "correcthorse123");

    await page.goto("/");
    await seedExpenses(page, [
      {
        value: 999,
        categoryName: "Others",
        description: "Should be gone",
        date: daysAgo(0),
        time: "09:00",
      },
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
    await seedExpenses(page, thisMonthWithAdhoc());

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

  test("a restore file over the threshold asks first", async ({ page }) => {
    await gotoApp(page, "/settings/data");
    const input = page.locator('[data-testid="import-file-input"]');
    const largeFile = {
      name: "large.extrack",
      mimeType: "application/octet-stream",
      buffer: Buffer.alloc(MAX_RESTORE_FILE_BYTES + 1, "a"),
    };

    const dialogMessages: string[] = [];
    page.once("dialog", (dialog) => {
      dialogMessages.push(dialog.message());
      void dialog.dismiss();
    });
    await input.setInputFiles(largeFile);
    await expect(input).toHaveValue("");
    expect(dialogMessages[0]).toContain("Try anyway?");
    // The persistent-storage warning may appear at startup; nothing else may.
    await expect(
      page
        .locator("[data-sonner-toast]")
        .filter({ hasNotText: "This browser may delete your data automatically" }),
    ).toHaveCount(0);

    page.once("dialog", (dialog) => void dialog.accept());
    await input.setInputFiles(largeFile);
    await expect(
      page.getByText("Only encrypted .extrack backup files can be imported"),
    ).toBeVisible();
  });

  test("unfinished restore is reported at the next start", async ({ page }) => {
    await page.addInitScript((key) => {
      try {
        localStorage.setItem(key, '{"step":"read","bytes":1}');
      } catch {
        // init script also runs on about:blank, where storage access can throw
      }
    }, RESTORE_MARKER_KEY);
    await gotoApp(page, "/");
    await expect(page.getByText(UNFINISHED_RESTORE_TOAST)).toBeVisible();
    await expect
      .poll(() => page.evaluate((key) => localStorage.getItem(key), RESTORE_MARKER_KEY))
      .toBeNull();
  });

  test("an unreadable restore marker is dropped silently", async ({ page }) => {
    await page.addInitScript((key) => {
      try {
        localStorage.setItem(key, "{");
      } catch {
        // init script also runs on about:blank, where storage access can throw
      }
    }, RESTORE_MARKER_KEY);
    await gotoApp(page, "/");
    await expect
      .poll(() => page.evaluate((key) => localStorage.getItem(key), RESTORE_MARKER_KEY))
      .toBeNull();
    await expect(page.getByText(UNFINISHED_RESTORE_TOAST)).toHaveCount(0);
  });

  test("a backup over the threshold warns", async ({ page }) => {
    await gotoApp(page, "/settings/data");
    await seedExpenses(
      page,
      Array.from({ length: 14 }, (_, i) => ({
        value: 10 + i,
        categoryName: "Others",
        description: `Receipt ${i}`,
        date: daysAgo(0),
        time: "10:00",
        // Random bytes so compression cannot shrink the backup below the threshold.
        attachment: "data:image/jpeg;base64," + randomBytes(750_000).toString("base64"),
      })),
    );
    await setPassphrase(page, "correcthorse123");

    await page.getByRole("button", { name: "Create Backup" }).first().click();
    const dialog = page.getByRole("dialog", { name: "Backup" });
    const downloadPromise = page.waitForEvent("download");
    await dialog.getByRole("button", { name: "Create Backup" }).click();
    await downloadPromise;
    await expect(
      page.getByText("Restoring it may fail on phones with little memory"),
    ).toBeVisible();
  });
});
