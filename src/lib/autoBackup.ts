// Orchestrates both auto-backup tiers: a local OPFS snapshot (Tier 1, always on) and a silent
// Drive upload (Tier 2, once Drive is linked and a passphrase exists). Runs once per calendar
// day per tier, on app foreground — see useAppStartup.ts. No background scheduler: PWAs have no
// dependable background execution, so "first launch of the day" is the trigger.
import { toast } from "sonner";
import { db, exportAllData, importData } from "@/db/expenseTrackerDb";
import {
  buildBackupEnvelope,
  encryptData,
  getBackupReminderPreferences,
  getStoredPassphrase,
  markAutoBackup,
  toDateKey,
} from "@/lib/backup";
import { uploadBackupToDrive } from "@/lib/backupTargets";
import { getDriveCredentials } from "@/db/driveCredentials";
import { DriveSessionExpiredError, getValidAccessToken } from "@/lib/driveAuth";
import { capture, captureError } from "@/lib/telemetry";
import {
  commitSnapshot,
  opfsAvailable,
  readManifest,
  readSnapshot,
  SnapshotQuotaError,
  type SnapshotManifestEntry,
} from "@/lib/snapshotStore";
import type { BackupReminderPreferences } from "@/db/userPreferences";
import type { Category, Expense } from "@/types/expense";

const RETENTION_COUNT = 8;
const ANOMALY_DROP_RATIO = 0.8;
const QUOTA_DEGRADE_THRESHOLD = 0.8;
const DRIVE_BACKUP_FILENAME = "extrack-backup-latest.extrack";

function maxUpdatedAt(expenses: Expense[]): string {
  return expenses.reduce((max, e) => (e.updatedAt > max ? e.updatedAt : max), "");
}

/** True if writing `bytes` more (after freeing `freed` from a smaller retention) would push
 *  usage past `QUOTA_DEGRADE_THRESHOLD` of the origin's quota. `storage.estimate()` is a rough
 *  browser-reported figure, so this whole check is a heuristic guard, not an exact budget. */
async function projectedOverQuota(bytes: number, freed = 0): Promise<boolean> {
  if (!navigator.storage?.estimate) return false;
  const { usage = 0, quota = 0 } = await navigator.storage.estimate();
  return usage - freed + bytes > quota * QUOTA_DEGRADE_THRESHOLD;
}

/** Applies the issue's degrade order when the plain snapshot would push storage past
 *  `QUOTA_DEGRADE_THRESHOLD`: shrink retention to 1 first (frees quota for this and future
 *  runs even though it doesn't shrink today's write), then strip attachments — the actual size
 *  driver — and flag the entry partial. Throws `SnapshotQuotaError` if even that doesn't fit. */
async function degradeForQuota(
  expenses: Expense[],
  categories: Category[],
  text: string,
  bytes: number,
  historyLen: number,
): Promise<{ text: string; bytes: number; partial: boolean; retain: number }> {
  if (!(await projectedOverQuota(bytes))) return { text, bytes, partial: false, retain: RETENTION_COUNT };

  const estimate = await navigator.storage.estimate();
  const freed = historyLen > 0 ? ((estimate.usage ?? 0) / historyLen) * (historyLen - 1) : 0;
  if (!(await projectedOverQuota(bytes, freed))) return { text, bytes, partial: false, retain: 1 };

  const stripped = expenses.map((expense) => {
    const { attachment: _attachment, ...rest } = expense;
    return rest;
  });
  const strippedText = buildBackupEnvelope({ expenses: stripped, categories });
  const strippedBytes = new TextEncoder().encode(strippedText).length;
  if (await projectedOverQuota(strippedBytes, freed)) throw new SnapshotQuotaError();

  return { text: strippedText, bytes: strippedBytes, partial: true, retain: 1 };
}

function isUnchangedSinceLastSnapshot(
  latest: SnapshotManifestEntry | null,
  expenseCount: number,
  maxUpdated: string,
): boolean {
  return latest !== null && latest.expenseCount === expenseCount && latest.maxUpdatedAt === maxUpdated;
}

function isCollapsedSinceLastSnapshot(latest: SnapshotManifestEntry | null, expenseCount: number): boolean {
  return latest !== null && expenseCount < latest.expenseCount * ANOMALY_DROP_RATIO;
}

async function runTier1(
  expenses: Expense[],
  categories: Category[],
  prefs: BackupReminderPreferences,
  todayKey: string,
  force: boolean,
): Promise<void> {
  const manifest = await readManifest();
  const latest: SnapshotManifestEntry | null = manifest?.history[0] ?? null;
  const currentMax = maxUpdatedAt(expenses);

  if (!force && isUnchangedSinceLastSnapshot(latest, expenses.length, currentMax)) {
    markAutoBackup({ lastAutoSnapshotAt: todayKey });
    return;
  }

  if (!force && latest && isCollapsedSinceLastSnapshot(latest, expenses.length)) {
    markAutoBackup({
      autoBackupAnomaly: `Expected ~${latest.expenseCount} expenses, found ${expenses.length}`,
    });
    captureError("auto_backup_failed", new Error("expense count collapsed"), {
      tier: "opfs",
      stage: "anomaly",
    });
    return;
  }

  const start = Date.now();
  try {
    const initialText = buildBackupEnvelope({ expenses, categories });
    const initialBytes = new TextEncoder().encode(initialText).length;
    const { text, bytes, partial, retain } = await degradeForQuota(
      expenses,
      categories,
      initialText,
      initialBytes,
      manifest?.history.length ?? 0,
    );

    await commitSnapshot(text, { partial }, retain);
    markAutoBackup({ lastAutoSnapshotAt: todayKey, autoBackupFailures: 0, autoBackupAnomaly: null });
    capture("auto_backup_succeeded", {
      tier: "opfs",
      expenseCount: expenses.length,
      byteSize: bytes,
      durationMs: Date.now() - start,
    });
  } catch (err) {
    markAutoBackup({ autoBackupFailures: prefs.autoBackupFailures + 1 });
    captureError("auto_backup_failed", err, { tier: "opfs", stage: "write" });
  }
}

async function runTier2(
  expenses: Expense[],
  categories: Category[],
  prefs: BackupReminderPreferences,
  todayKey: string,
): Promise<void> {
  const creds = await getDriveCredentials();
  if (!creds) return;
  if (!navigator.onLine) return; // offline is not a failure; retried on the next foreground

  const passphrase = await getStoredPassphrase();
  if (!passphrase) return; // BackupCard derives the actionable row from creds && !passphrase

  const start = Date.now();
  try {
    const accessToken = await getValidAccessToken();
    const encrypted = await encryptData(buildBackupEnvelope({ expenses, categories }));
    const result = await uploadBackupToDrive(encrypted, DRIVE_BACKUP_FILENAME, accessToken, expenses.length);
    if (!result) return; // credentials vanished mid-call; treated as a silent no-op

    markAutoBackup({ lastAutoDriveAt: todayKey, autoBackupFailures: 0 });
    capture("auto_backup_succeeded", {
      tier: "drive",
      expenseCount: expenses.length,
      byteSize: new TextEncoder().encode(encrypted).length,
      durationMs: Date.now() - start,
    });
  } catch (err) {
    if (err instanceof DriveSessionExpiredError) {
      // Credentials are already cleared inside driveAuth — structurally no retry.
      toast.error("Google Drive session expired. Please reconnect.", {
        action: { label: "Go to Settings", onClick: () => (window.location.href = "/settings/data") },
      });
      captureError("auto_backup_failed", err, { tier: "drive", stage: "auth" });
      return;
    }
    markAutoBackup({ autoBackupFailures: prefs.autoBackupFailures + 1 });
    captureError("auto_backup_failed", err, { tier: "drive", stage: "upload" });
  }
}

async function runAutoBackupBody(force: boolean): Promise<void> {
  const { expenses, categories } = await exportAllData();
  const prefs = getBackupReminderPreferences();
  const todayKey = toDateKey(new Date());

  if (expenses.length === 0) {
    // Nothing to rescue, and a second guard against snapshotting a wipe — a manifest with a
    // nonzero last count means the DB just went from something to nothing.
    const manifest = await readManifest();
    const prevCount = manifest?.history[0]?.expenseCount ?? 0;
    if (prevCount > 0) {
      markAutoBackup({ autoBackupAnomaly: `Expected ~${prevCount} expenses, found 0` });
      captureError("auto_backup_failed", new Error("expense count collapsed to zero"), {
        tier: "opfs",
        stage: "anomaly",
      });
    }
    return;
  }

  if (force || prefs.lastAutoSnapshotAt !== todayKey) {
    await runTier1(expenses, categories, prefs, todayKey, force);
  }

  const latestPrefs = getBackupReminderPreferences();
  if (force || latestPrefs.lastAutoDriveAt !== todayKey) {
    await runTier2(expenses, categories, latestPrefs, todayKey);
  }
}

/** Fired on `window` after every `runAutoBackup` call settles — `AutoBackupStatus` listens for
 *  this to refresh, since the write happens in a fire-and-forget call from useAppStartup with no
 *  other signal that state changed. */
export const AUTO_BACKUP_UPDATED_EVENT = "extrack:auto-backup-updated";

/** Runs both auto-backup tiers, serialized across tabs via the Web Locks API when available.
 *  `force: true` bypasses the daily gate and the anomaly guard — the manual escape hatch behind
 *  the "Snapshot now" button after a legitimate large prune blocked the automatic run. */
export async function runAutoBackup({ force = false }: { force?: boolean } = {}): Promise<void> {
  if (!opfsAvailable()) return;

  try {
    if (navigator.locks?.request) {
      await navigator.locks.request("extrack-auto-backup", () => runAutoBackupBody(force));
    } else {
      await runAutoBackupBody(force);
    }
  } finally {
    window.dispatchEvent(new Event(AUTO_BACKUP_UPDATED_EVENT));
  }
}

/** Restores a snapshot by name. Refuses one written by a newer schema than the running app, and
 *  otherwise never touches `validateImportFile` — the 10MB cap that guards user-picked files
 *  doesn't apply to a snapshot this app wrote itself. */
export async function restoreSnapshot(name: string): Promise<{ expenseCount: number }> {
  const snapshot = await readSnapshot(name);
  if (!snapshot) throw new Error("Safety copy not found");
  if (snapshot.schemaVersion > db.verno) {
    throw new Error(
      "This safety copy was made by a newer version of ExTrack. Update the app to restore it.",
    );
  }
  await importData({ expenses: snapshot.expenses, categories: snapshot.categories });
  return { expenseCount: snapshot.expenses.length };
}
