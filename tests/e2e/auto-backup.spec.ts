import type { Page } from "@playwright/test";
import { test, expect } from "../support/fixtures";
import { gotoApp, daysAgo } from "../support/app";
import { seedExpenses, readExpenses } from "../support/db";
import { thisMonth3 } from "../support/data";
import { BASE_URL, isDeployed } from "../support/env";
import { mockDrive } from "../support/mock-drive";

interface SnapshotManifestEntry {
  name: string;
  writtenAt: string;
  expenseCount: number;
  partial?: boolean;
}

interface SnapshotManifest {
  latest: string;
  history: SnapshotManifestEntry[];
  schemaVersion: number;
  writtenAt: string;
}

// Only this spec reads OPFS, so this helper stays local rather than living in tests/support.
async function readManifest(page: Page): Promise<SnapshotManifest | null> {
  return page.evaluate(async () => {
    try {
      const root = await navigator.storage.getDirectory();
      const dir = await root.getDirectoryHandle("backups");
      const f = await (await dir.getFileHandle("manifest.json")).getFile();
      return JSON.parse(await f.text());
    } catch {
      return null;
    }
  });
}

async function countSnapshotFiles(page: Page): Promise<number> {
  return page.evaluate(async () => {
    try {
      const root = await navigator.storage.getDirectory();
      const dir = await root.getDirectoryHandle("backups");
      let count = 0;
      for await (const name of dir.keys()) {
        if (name !== "manifest.json") count++;
      }
      return count;
    } catch {
      return 0;
    }
  });
}

/** Forces every navigation from here on to look like a new day to the auto-backup date-gate —
 *  the test fixture's own `addInitScript` resets `expense-tracker-backup-reminder` on every
 *  navigation (see `installHarness`), so a one-off `localStorage.setItem` would be wiped by the
 *  very reload meant to exercise it. Registering another `addInitScript` after the fixture's
 *  wins for every subsequent navigation, same recipe as `backup-reminder.spec.ts`. */
async function forceRolledDay(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try {
      const raw = localStorage.getItem("expense-tracker-backup-reminder");
      const prefs = raw ? JSON.parse(raw) : {};
      prefs.lastAutoSnapshotAt = "2000-01-01";
      localStorage.setItem("expense-tracker-backup-reminder", JSON.stringify(prefs));
    } catch {
      // init script also runs on about:blank, where storage access can throw
    }
  });
}

/** Clears the `expenses` object store directly, bypassing Dexie — simulates the kind of wipe
 *  Tier 1 exists to rescue from (corruption, a bad migration, an override import). */
async function clearExpensesTable(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const req = indexedDB.open("ExpenseTrackerDB");
        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction("expenses", "readwrite");
          tx.objectStore("expenses").clear();
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => {
            db.close();
            reject(tx.error);
          };
        };
      }),
  );
}

test.describe("auto-backup", () => {
  test("writes an OPFS snapshot and manifest on the first foreground of the day, with no user interaction", async ({
    page,
  }) => {
    await gotoApp(page, "/");
    // seedExpenses' own reload is the second foreground; the first had 0 expenses and
    // deliberately wrote nothing (nothing to rescue).
    await seedExpenses(page, thisMonth3());

    await expect.poll(() => readManifest(page)).not.toBeNull();
    const manifest = await readManifest(page);
    expect(manifest?.history[0].expenseCount).toBe(3);
    expect(manifest?.latest).toBe(manifest?.history[0].name);
  });

  test("a second foreground on the same day does not write again", async ({ page }) => {
    await gotoApp(page, "/");
    await seedExpenses(page, thisMonth3());
    await expect.poll(() => readManifest(page)).not.toBeNull();
    const before = await readManifest(page);

    await page.reload();
    await page.waitForTimeout(500);

    const after = await readManifest(page);
    expect(after?.writtenAt).toBe(before?.writtenAt);
    expect(await countSnapshotFiles(page)).toBe(1);
  });

  test("a rolled day with no data change does not write a new snapshot", async ({ page }) => {
    await gotoApp(page, "/");
    await seedExpenses(page, thisMonth3());
    await expect.poll(() => readManifest(page)).not.toBeNull();
    const before = await readManifest(page);

    await forceRolledDay(page);
    await page.reload();
    await page.waitForTimeout(500);

    const after = await readManifest(page);
    expect(after?.history.length).toBe(before?.history.length);
    expect(after?.latest).toBe(before?.latest);
  });

  test("a rolled day with a new expense writes exactly one snapshot, capped at 8", async ({ page }) => {
    test.slow();
    await gotoApp(page, "/");
    await seedExpenses(page, thisMonth3());
    await expect.poll(() => readManifest(page)).not.toBeNull();

    for (let i = 0; i < 9; i++) {
      await forceRolledDay(page);
      await seedExpenses(page, [
        { value: 10 + i, categoryName: "Others", description: `Rolled ${i}`, date: daysAgo(0), time: "09:00" },
      ]);
      await page.waitForTimeout(400);
    }

    const manifest = await readManifest(page);
    expect(manifest?.history.length).toBe(8);
    expect(await countSnapshotFiles(page)).toBe(8);
  });

  test("a collapsed expense count does not overwrite the existing snapshot", async ({ page }) => {
    await gotoApp(page, "/");
    await seedExpenses(page, thisMonth3());
    await expect.poll(() => readManifest(page)).not.toBeNull();
    const before = await readManifest(page);

    await forceRolledDay(page);
    await clearExpensesTable(page);
    await page.reload();
    await page.waitForTimeout(800);

    const after = await readManifest(page);
    expect(after?.latest).toBe(before?.latest);
    expect(after?.writtenAt).toBe(before?.writtenAt);

    await page.goto("/settings/data");
    await expect(page.getByText(/Expected ~3 expenses, found 0/)).toBeVisible();
  });

  test("a wiped database offers the newest snapshot and restores it in one tap", async ({ page }) => {
    await gotoApp(page, "/");
    await seedExpenses(page, thisMonth3());
    await expect.poll(() => readManifest(page)).not.toBeNull();

    await clearExpensesTable(page);
    await page.reload();

    const dialog = page.getByRole("alertdialog");
    await expect(dialog.getByText(/local safety copy.*3.*expenses\. Restore it\?/s)).toBeVisible();
    await dialog.getByRole("button", { name: "Restore 3 expenses" }).click();

    await expect(page.getByText(/Restored 3 expenses/)).toBeVisible();
    await page.goto("/transactions");
    await expect(page.getByText("Groceries")).toBeVisible();
    await expect(page.getByText("Metro pass")).toBeVisible();
    await expect(page.getByText("Headphones")).toBeVisible();
  });

  test("a snapshot larger than 10MB restores", async ({ page }) => {
    test.slow();
    const bigAttachment = `data:image/jpeg;base64,${"A".repeat(4_000_000)}`;
    await gotoApp(page, "/");
    await seedExpenses(page, [
      { value: 10, categoryName: "Others", description: "Photo receipt 1", date: daysAgo(0), time: "09:00", attachment: bigAttachment },
      { value: 20, categoryName: "Others", description: "Photo receipt 2", date: daysAgo(0), time: "10:00", attachment: bigAttachment },
      { value: 30, categoryName: "Others", description: "Photo receipt 3", date: daysAgo(0), time: "11:00", attachment: bigAttachment },
    ]);

    await expect.poll(() => readManifest(page), { timeout: 20_000 }).not.toBeNull();
    const manifest = await readManifest(page);
    expect(manifest?.history[0].expenseCount).toBe(3);
    expect(manifest?.history[0].partial).toBeFalsy();

    await clearExpensesTable(page);
    await page.reload();

    const dialog = page.getByRole("alertdialog");
    const restoreButton = dialog.getByRole("button", { name: "Restore 3 expenses" });
    await expect(restoreButton).toBeVisible({ timeout: 20_000 });
    await restoreButton.click();

    await expect(page.getByText(/Restored 3 expenses/)).toBeVisible({ timeout: 20_000 });
    await page.goto("/transactions");
    await expect(page.getByText("Photo receipt 1")).toBeVisible();
  });

  test("a snapshot from a newer schema version is refused", async ({ page }) => {
    const FUTURE_SNAPSHOT = "snapshot-9999999999999.json";
    // Suppress the empty-state restore-offer dialog for this fake snapshot on every navigation —
    // this test exercises the restore flow via BackupCard's own "Restore from safety copy" list,
    // not the auto-popped dialog, and a plain localStorage.setItem would be wiped by the very
    // `goto` navigation below (see forceRolledDay's doc comment for why).
    await page.addInitScript((name) => {
      try {
        const raw = localStorage.getItem("expense-tracker-backup-reminder");
        const prefs = raw ? JSON.parse(raw) : {};
        prefs.restoreOfferDeclinedFor = name;
        localStorage.setItem("expense-tracker-backup-reminder", JSON.stringify(prefs));
      } catch {
        // init script also runs on about:blank, where storage access can throw
      }
    }, FUTURE_SNAPSHOT);

    await gotoApp(page, "/");

    // Hand-write a manifest + snapshot from schema version 99 — newer than the running app.
    await page.evaluate(async (name) => {
      const root = await navigator.storage.getDirectory();
      const dir = await root.getDirectoryHandle("backups", { create: true });
      const now = new Date().toISOString();

      const snapshotHandle = await dir.getFileHandle(name, { create: true });
      const snapshotWritable = await snapshotHandle.createWritable();
      await snapshotWritable.write(
        JSON.stringify({
          exportDate: now,
          version: "1.0",
          schemaVersion: 99,
          expenses: [
            {
              id: "future-1",
              value: 1,
              category: "c1",
              tags: [],
              date: "2026-01-01",
              time: "09:00",
              isAdhoc: false,
              createdAt: now,
              updatedAt: now,
            },
          ],
          categories: [],
        }),
      );
      await snapshotWritable.close();

      const manifestHandle = await dir.getFileHandle("manifest.json", { create: true });
      const manifestWritable = await manifestHandle.createWritable();
      await manifestWritable.write(
        JSON.stringify({
          latest: name,
          history: [{ name, writtenAt: now, expenseCount: 1, maxUpdatedAt: now }],
          schemaVersion: 99,
          writtenAt: now,
        }),
      );
      await manifestWritable.close();
    }, FUTURE_SNAPSHOT);

    await page.goto("/settings/data");
    await page.getByRole("button", { name: "Restore from safety copy" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Restore" }).click();

    await expect(page.getByText(/newer version of ExTrack/)).toBeVisible();
    expect(await readExpenses(page)).toEqual([]);
  });

  test("Drive linked with a passphrase uploads silently to a fixed name", async ({ page }) => {
    test.skip(isDeployed, "mocked Drive endpoints are not exercised against deployments");
    const drive = await mockDrive(page);

    await gotoApp(page, "/settings/data");
    await seedExpenses(page, thisMonth3());
    await page.evaluate(() => sessionStorage.setItem("expense-tracker-pkce-verifier", "test-verifier"));
    await page.goto("/oauth/callback?code=test-code");
    await expect(page).toHaveURL(`${BASE_URL}/settings/data`);

    await page.getByRole("button", { name: "Set Passphrase" }).click();
    const setupDialog = page.getByRole("dialog");
    await setupDialog.getByLabel("Passphrase", { exact: true }).fill("correcthorse123");
    await setupDialog.getByLabel("Confirm Passphrase").fill("correcthorse123");
    await setupDialog.getByRole("button", { name: "Set Passphrase" }).click();
    await expect(page.getByText("Encryption passphrase saved")).toBeVisible();

    await page.reload();

    await expect.poll(() => drive.lastUpload()).toBeTruthy();
    const uploaded = drive.lastUpload();
    expect(uploaded).not.toContain("Groceries");
    expect(JSON.parse(uploaded ?? "{}").format).toBe("extrack-encrypted-backup");
    expect(drive.lastUploadName()).toBe("extrack-backup-latest.extrack");
  });

  test("Drive linked without a passphrase skips tier 2 and shows one actionable row", async ({ page }) => {
    test.skip(isDeployed, "mocked Drive endpoints are not exercised against deployments");
    await mockDrive(page);

    await gotoApp(page, "/settings/data");
    await seedExpenses(page, thisMonth3());
    await page.evaluate(() => sessionStorage.setItem("expense-tracker-pkce-verifier", "test-verifier"));
    await page.goto("/oauth/callback?code=test-code");
    await expect(page).toHaveURL(`${BASE_URL}/settings/data`);

    await page.reload();
    await page.waitForTimeout(500);

    await expect(page.getByText("Drive is linked but no passphrase is set")).toBeVisible();
    await expect(page.getByText("Backup saved to Google Drive")).toHaveCount(0);
  });

  test("a browser without OPFS boots normally", async ({ page }) => {
    await page.addInitScript(() => {
      const storage = navigator.storage as unknown as { getDirectory?: () => Promise<unknown> };
      delete storage.getDirectory;
    });
    await gotoApp(page, "/");
    await seedExpenses(page, thisMonth3());

    await page.goto("/settings/data");
    await expect(page.getByText("Safety copy:", { exact: false })).toHaveCount(0);
  });
});
