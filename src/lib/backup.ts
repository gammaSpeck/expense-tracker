import { differenceInCalendarDays, format, isValid, parseISO } from "date-fns";
import { get, set, del, createStore } from "idb-keyval";
import {
  type BackupReminderPreferences,
  type BackupReminderSchedule,
  MONTHLY_REMINDER_DAY,
  WEEKLY_REMINDER_DAY,
  userPreferences,
} from "@/db/userPreferences";

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

function b64uEncode(buf: Uint8Array<ArrayBuffer>): string {
  return btoa(String.fromCharCode(...buf))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function b64uDecode(str: string): Uint8Array<ArrayBuffer> {
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

function toDateKey(value: Date): string {
  return format(value, "yyyy-MM-dd");
}

function isReminderSchedule(value: unknown): value is BackupReminderSchedule {
  return value === "never" || value === "daily" || value === "weekly" || value === "monthly";
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
  };
}

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

  const isOverdue =
    (preferences.reminderSchedule === "daily" && daysSinceLastBackup >= 1) ||
    (preferences.reminderSchedule === "weekly" && daysSinceLastBackup >= 7) ||
    (preferences.reminderSchedule === "monthly" && daysSinceLastBackup >= 30);

  if (!isOverdue) return false;

  switch (preferences.reminderSchedule) {
    case "daily":
      return true;
    case "weekly":
      return now.getDay() === WEEKLY_REMINDER_DAY;
    case "monthly":
      return now.getDate() === MONTHLY_REMINDER_DAY;
    default:
      return false;
  }
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

export function setBackupReminderSchedule(
  reminderSchedule: BackupReminderSchedule,
): BackupReminderPreferences {
  return userPreferences.updateBackupReminderPreferences({ reminderSchedule });
}
