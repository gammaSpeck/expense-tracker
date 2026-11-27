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
import type { Expense, Category } from "@/types/expense";

// ---------------------------------------------------------------------------
// Encryption store — reuses the same IndexedDB database as driveCredentials
// ---------------------------------------------------------------------------
const encStore = createStore("expense-tracker-drive", "credentials");
const PASSPHRASE_KEY = "encryption-passphrase";

const ITERATIONS = 600_000;

interface ExtrackEnvelope {
  format: "extrack-encrypted-backup";
  version: string;
  algorithm: "AES-GCM";
  kdf: "PBKDF2-SHA256";
  iterations: number;
  salt: string;
  iv: string;
  ciphertext: string;
  check?: string;
}

export const KNOWN_BACKUP_VERSIONS: readonly string[] = ["1", "2"];
export const NEWER_VERSION_MESSAGE =
  "This backup was made by a newer version of ExTrack. Close and reopen the app, and accept the update if asked.";
export const WRONG_PASSPHRASE_MESSAGE = "Wrong passphrase — decryption failed";

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

async function deriveKey(
  passphrase: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations = ITERATIONS,
): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

async function gunzip(bytes: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>> {
  return new Uint8Array(
    await new Response(
      new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip")),
    ).arrayBuffer(),
  );
}

async function gzip(bytes: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>> {
  return new Uint8Array(
    await new Response(
      new Blob([bytes]).stream().pipeThrough(new CompressionStream("gzip")),
    ).arrayBuffer(),
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

export async function encryptData(plaintext: string, passphrase: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16)) as Uint8Array<ArrayBuffer>;
  const iv = crypto.getRandomValues(new Uint8Array(12)) as Uint8Array<ArrayBuffer>;
  const checkIv = crypto.getRandomValues(new Uint8Array(12)) as Uint8Array<ArrayBuffer>;
  const key = await deriveKey(passphrase, salt);
  const bytes = new TextEncoder().encode(plaintext) as Uint8Array<ArrayBuffer>;

  // ponytail: version-1 fallback for browsers below the supported minimum (Chrome 112,
  // Firefox 113, Safari/iOS 16.4); remove when backups from such browsers stop appearing.
  const compress = typeof CompressionStream !== "undefined";
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    compress ? await gzip(bytes) : bytes,
  );
  // Passphrase check: its own IV followed by AES-GCM("extrack"), so the reader can tell a
  // wrong passphrase from a failure inside the ciphertext decrypt.
  const check = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: checkIv },
    key,
    new TextEncoder().encode("extrack"),
  );

  const envelope: ExtrackEnvelope = {
    format: "extrack-encrypted-backup",
    version: compress ? "2" : "1",
    algorithm: "AES-GCM",
    kdf: "PBKDF2-SHA256",
    iterations: ITERATIONS,
    salt: b64uEncode(salt),
    iv: b64uEncode(iv),
    ciphertext: b64uEncode(new Uint8Array(ciphertext) as Uint8Array<ArrayBuffer>),
    check: b64uEncode(new Uint8Array([...checkIv, ...new Uint8Array(check)])),
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
  // Before key derivation, so an unknown version never costs the 600,000-iteration PBKDF2.
  if (!KNOWN_BACKUP_VERSIONS.includes(envelope.version)) {
    throw new Error(NEWER_VERSION_MESSAGE);
  }

  const resolvedPassphrase = passphrase ?? (await getStoredPassphrase());
  if (!resolvedPassphrase) throw new Error("No passphrase provided");

  const salt = b64uDecode(envelope.salt);
  const iv = b64uDecode(envelope.iv);
  const ciphertext = b64uDecode(envelope.ciphertext);

  // The file's own iteration count, for forward-compatibility.
  const key = await deriveKey(resolvedPassphrase, salt, envelope.iterations);

  if (envelope.check) {
    // The GCM tag authenticates the check, so a successful decrypt proves the passphrase.
    const check = b64uDecode(envelope.check);
    try {
      await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: check.subarray(0, 12) },
        key,
        check.subarray(12),
      );
    } catch {
      throw new Error(WRONG_PASSPHRASE_MESSAGE);
    }
  }

  let plaintext: Uint8Array<ArrayBuffer>;
  try {
    plaintext = new Uint8Array(
      await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext),
    );
  } catch {
    // Without a check, a failed decrypt cannot tell a wrong passphrase from anything else.
    throw new Error(envelope.check ? "Backup could not be decrypted" : WRONG_PASSPHRASE_MESSAGE);
  }

  if (envelope.version === "2") {
    try {
      plaintext = await gunzip(plaintext);
    } catch {
      throw new Error("Backup decrypted but could not be unpacked");
    }
  }
  return new TextDecoder().decode(plaintext);
}

/** The wrapper's `version` when `content` is an ExTrack encrypted backup, else `null`. */
export function readEnvelopeVersion(content: string): string | null {
  try {
    const parsed = JSON.parse(content) as { format?: unknown; version?: unknown };
    return parsed.format === "extrack-encrypted-backup" && typeof parsed.version === "string"
      ? parsed.version
      : null;
  } catch {
    return null;
  }
}

/** `null` when no passphrase is stored or it is wrong; every other error is re-thrown. */
export async function decryptWithStoredPassphrase(text: string): Promise<string | null> {
  const stored = await getStoredPassphrase();
  if (!stored) return null;
  try {
    return await decryptData(text, stored);
  } catch (err) {
    if (err instanceof Error && err.message === WRONG_PASSPHRASE_MESSAGE) return null;
    throw err;
  }
}

export async function createEncryptedBackupFile(data: {
  expenses: Expense[];
  categories: Category[];
}): Promise<{ filename: string; encrypted: string }> {
  const dateToken = format(new Date(), "yyyy-MM-dd");
  const filename = `extrack-backup-${dateToken}.extrack`;
  const passphrase = await getStoredPassphrase();
  if (!passphrase) throw new Error("No encryption passphrase set");
  const encrypted = await encryptData(buildBackupEnvelope(data), passphrase);
  return { filename, encrypted };
}

function toDateKey(value: Date): string {
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

export function setBackupReminderSchedule(
  reminderSchedule: BackupReminderSchedule,
): BackupReminderPreferences {
  return userPreferences.updateBackupReminderPreferences({ reminderSchedule });
}
