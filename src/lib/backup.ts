import { differenceInCalendarDays, format, isValid, parseISO } from "date-fns";
import { get, set, del, createStore } from "idb-keyval";
import {
  type BackupReminderPreferences,
  type BackupReminderSchedule,
  MONTHLY_REMINDER_DAY,
  WEEKLY_REMINDER_DAY,
  isReminderSchedule,
  userPreferences,
} from "@/db/userPreferences";
import { db } from "@/db/expenseTrackerDb";
import type { Expense, Category } from "@/types/expense";

// ---------------------------------------------------------------------------
// Encryption store — reuses the same IndexedDB database as driveCredentials
// ---------------------------------------------------------------------------
const encStore = createStore("expense-tracker-drive", "credentials");
const PASSPHRASE_KEY = "encryption-passphrase";

const ITERATIONS = 600_000;

interface ExtrackEnvelope {
  format: "extrack-encrypted-backup";
  version: "1";
  algorithm: "AES-GCM";
  kdf: "PBKDF2-SHA256";
  iterations: number;
  salt: string;
  iv: string;
  ciphertext: string;
}

const B64_CHUNK = 0x8000; // 32 KiB of args per call — far under any engine's argument limit

export function b64uEncode(buf: Uint8Array<ArrayBuffer>): string {
  let bin = "";
  for (let i = 0; i < buf.length; i += B64_CHUNK) {
    bin += String.fromCharCode(...buf.subarray(i, i + B64_CHUNK));
  }
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function b64uDecode(str: string): Uint8Array<ArrayBuffer> {
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0)) as Uint8Array<ArrayBuffer>;
}

async function deriveKey(passphrase: string, salt: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: ITERATIONS },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

// ---------------------------------------------------------------------------
// Public passphrase management
// ---------------------------------------------------------------------------

export async function getStoredPassphrase(): Promise<string | null> {
  return (await get<string>(PASSPHRASE_KEY, encStore)) ?? null;
}

export async function storePassphrase(passphrase: string): Promise<void> {
  await set(PASSPHRASE_KEY, passphrase, encStore);
}

export async function clearPassphrase(): Promise<void> {
  await del(PASSPHRASE_KEY, encStore);
}

// ---------------------------------------------------------------------------
// Backup envelope
// ---------------------------------------------------------------------------

export function buildBackupEnvelope(data: { expenses: Expense[]; categories: Category[] }): string {
  return JSON.stringify(
    {
      exportDate: new Date().toISOString(),
      version: "1.0",
      schemaVersion: db.verno,
      expenses: data.expenses,
      categories: data.categories,
    },
    null,
    2,
  );
}

// ---------------------------------------------------------------------------
// Encrypt / Decrypt
// ---------------------------------------------------------------------------

export async function encryptData(plaintext: string): Promise<string> {
  const passphrase = await getStoredPassphrase();
  if (!passphrase) throw new Error("No encryption passphrase set");

  const salt = crypto.getRandomValues(new Uint8Array(16)) as Uint8Array<ArrayBuffer>;
  const iv = crypto.getRandomValues(new Uint8Array(12)) as Uint8Array<ArrayBuffer>;
  const key = await deriveKey(passphrase, salt);

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(plaintext),
  );

  const envelope: ExtrackEnvelope = {
    format: "extrack-encrypted-backup",
    version: "1",
    algorithm: "AES-GCM",
    kdf: "PBKDF2-SHA256",
    iterations: ITERATIONS,
    salt: b64uEncode(salt),
    iv: b64uEncode(iv),
    ciphertext: b64uEncode(new Uint8Array(ciphertext) as Uint8Array<ArrayBuffer>),
  };

  return JSON.stringify(envelope, null, 2);
}

export async function decryptData(encryptedJson: string, passphrase?: string): Promise<string> {
  let envelope: ExtrackEnvelope;
  try {
    envelope = JSON.parse(encryptedJson) as ExtrackEnvelope;
  } catch {
    throw new Error("Invalid encrypted file");
  }

  if (envelope.format !== "extrack-encrypted-backup") {
    throw new Error("Not an encrypted backup file");
  }

  const resolvedPassphrase = passphrase ?? (await getStoredPassphrase());
  if (!resolvedPassphrase) throw new Error("No passphrase provided");

  const salt = b64uDecode(envelope.salt);
  const iv = b64uDecode(envelope.iv);
  const ciphertext = b64uDecode(envelope.ciphertext);

  // Use iterations stored in the file for forward-compatibility
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(resolvedPassphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: envelope.iterations },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"],
  );

  try {
    const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
    return new TextDecoder().decode(plaintext);
  } catch {
    throw new Error("Wrong passphrase — decryption failed");
  }
}

export function isEncryptedFile(content: string): boolean {
  try {
    const parsed = JSON.parse(content) as { format?: string };
    return parsed.format === "extrack-encrypted-backup";
  } catch {
    return false;
  }
}

export async function decryptWithStoredPassphrase(text: string): Promise<string | null> {
  const stored = await getStoredPassphrase();
  if (!stored) return null;
  try {
    return await decryptData(text, stored);
  } catch {
    return null;
  }
}

export async function createEncryptedBackupFile(data: {
  expenses: Expense[];
  categories: Category[];
}): Promise<{ filename: string; encrypted: string }> {
  const dateToken = format(new Date(), "yyyy-MM-dd");
  const filename = `extrack-backup-${dateToken}.extrack`;
  const encrypted = await encryptData(buildBackupEnvelope(data));
  return { filename, encrypted };
}

export function toDateKey(value: Date): string {
  return format(value, "yyyy-MM-dd");
}

export function getBackupReminderPreferences(): BackupReminderPreferences {
  const preferences = userPreferences.getBackupReminderPreferences();

  return {
    reminderSchedule: isReminderSchedule(preferences.reminderSchedule)
      ? preferences.reminderSchedule
      : "weekly",
    lastBackupDate: preferences.lastBackupDate,
    lastBackupMode: preferences.lastBackupMode,
    bannerLastShownDate: preferences.bannerLastShownDate,
    lastAutoSnapshotAt: preferences.lastAutoSnapshotAt,
    lastAutoDriveAt: preferences.lastAutoDriveAt,
    autoBackupFailures: preferences.autoBackupFailures,
    autoBackupAnomaly: preferences.autoBackupAnomaly,
    restoreOfferDeclinedFor: preferences.restoreOfferDeclinedFor,
  };
}

const OVERDUE_DAYS: Record<"daily" | "weekly" | "monthly", number> = {
  daily: 1,
  weekly: 7,
  monthly: 30,
};

export function shouldShowBackupReminderBanner(
  preferences: BackupReminderPreferences,
  now: Date = new Date(),
): boolean {
  if (!isReminderSchedule(preferences.reminderSchedule)) return false;
  if (preferences.reminderSchedule === "never") return false;

  const todayKey = toDateKey(now);
  if (preferences.bannerLastShownDate === todayKey) return false;

  const daysSinceLastBackup = getDaysSinceLastBackup(preferences.lastBackupDate, now);

  if (daysSinceLastBackup === null) return true;

  if (daysSinceLastBackup < OVERDUE_DAYS[preferences.reminderSchedule]) return false;

  return isTodayReminderDay(preferences.reminderSchedule, now);
}

export function isTodayReminderDay(
  schedule: BackupReminderSchedule,
  now: Date = new Date(),
): boolean {
  switch (schedule) {
    case "daily":
      return true;
    case "weekly":
      return now.getDay() === WEEKLY_REMINDER_DAY;
    case "monthly":
      return now.getDate() === MONTHLY_REMINDER_DAY;
    case "never":
      return false;
    default:
      return false;
  }
}

export function getDaysSinceLastBackup(
  lastBackupDate: string | null,
  now: Date = new Date(),
): number | null {
  if (!lastBackupDate) return null;

  const parsed = parseISO(lastBackupDate);
  if (!isValid(parsed)) return null;

  return Math.max(0, differenceInCalendarDays(now, parsed));
}

export function markBackupReminderBannerShown(now: Date = new Date()): BackupReminderPreferences {
  return userPreferences.updateBackupReminderPreferences({
    bannerLastShownDate: toDateKey(now),
  });
}

export function markBackupCompleted(
  mode: "device" | "drive",
  now: Date = new Date(),
): BackupReminderPreferences {
  return userPreferences.updateBackupReminderPreferences({
    lastBackupDate: toDateKey(now),
    lastBackupMode: mode,
  });
}

export function markAutoBackup(patch: Partial<BackupReminderPreferences>): BackupReminderPreferences {
  return userPreferences.updateBackupReminderPreferences(patch);
}

export function setBackupReminderSchedule(
  reminderSchedule: BackupReminderSchedule,
): BackupReminderPreferences {
  return userPreferences.updateBackupReminderPreferences({ reminderSchedule });
}
