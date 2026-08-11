import type { BrowserContext, Download, Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { format, subDays } from "date-fns";

/** `page.goto(path)`, then wait until Dexie boot has seeded the default categories. */
export async function gotoApp(page: Page, path = "/"): Promise<void> {
  await page.goto(path);
  await page.waitForFunction(
    () =>
      new Promise<boolean>((resolve) => {
        const req = indexedDB.open("ExpenseTrackerDB");
        req.onerror = () => resolve(false);
        req.onsuccess = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains("categories")) {
            db.close();
            resolve(false);
            return;
          }
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
}

/** `YYYY-MM-DD` in LOCAL time, `n` days before today. Never `toISOString()` — that is UTC
 *  and shifts the day for IST users, breaking Today/Yesterday grouping assertions. */
export function daysAgo(n: number): string {
  return format(subDays(new Date(), n), "yyyy-MM-dd");
}

export async function readDownload(download: Download): Promise<string> {
  return readFile(await download.path(), "utf-8");
}

/** Route mocks + localStorage seeding shared by the `page` fixture and the installed-PWA
 *  launchers: block the analytics beacon and Google Fonts, and start every profile with the
 *  backup-reminder banner off, dark theme, INR currency. */
export async function installHarness(target: Page | BrowserContext): Promise<void> {
  await target.route("**/xtk/**", (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: "{}" }),
  );
  // `index.css` @imports fonts.googleapis.com, whose stylesheet then makes the browser fetch
  // fonts.gstatic.com/*.woff2 — a real network call to a third-party CDN that has nothing to
  // do with app correctness and occasionally 404s in this environment, flaking whichever test
  // happens to be loading a page at the time. An empty stylesheet means no @font-face rules,
  // so the woff2 requests never happen at all — falls back to a system font, which no test
  // asserts on.
  await target.route("**fonts.googleapis.com/**", (r) =>
    r.fulfill({ status: 200, contentType: "text/css", body: "" }),
  );
  await target.addInitScript(() => {
    try {
      localStorage.setItem(
        "expense-tracker-backup-reminder",
        JSON.stringify({
          reminderSchedule: "never",
          lastBackupDate: null,
          lastBackupMode: null,
          bannerLastShownDate: null,
        }),
      );
      localStorage.setItem("expense-tracker-theme", "dark");
      localStorage.setItem("expense-tracker-currency", "INR");
    } catch {
      // init script also runs on about:blank, where storage access can throw
    }
  });
}

export const DEFAULT_CATEGORY_NAMES = [
  "Food & Dining",
  "Shopping",
  "Transport",
  "Medical",
  "Bills",
  "Entertainment",
  "Others",
];
