import { Theme } from "@/types/expense";
import { pickEnum, pickString } from "@/lib/validation";

export type BackupReminderSchedule = "never" | "daily" | "weekly" | "monthly";

export function isReminderSchedule(value: unknown): value is BackupReminderSchedule {
  return value === "never" || value === "daily" || value === "weekly" || value === "monthly";
}

export type BackupMode = "device" | "drive";

export interface BackupReminderPreferences {
  reminderSchedule: BackupReminderSchedule;
  lastBackupDate: string | null;
  lastBackupMode: BackupMode | null;
  bannerLastShownDate: string | null;
}

export interface InstallMarker {
  installedAt: string; // ISO
  lastSeenAt: string; // ISO
  lastSeenExpenseCount: number;
}

export interface WhatsNewState {
  lastSeenVersion: string; // "x.y.z"
  lastSeenAt: string; // ISO
}

const STORAGE_KEYS = {
  currency: "expense-tracker-currency",
  theme: "expense-tracker-theme",
  backupReminder: "expense-tracker-backup-reminder",
  install: "expense-tracker-install",
  whatsNew: "expense-tracker-whats-new",
} as const;

const WEEKLY_REMINDER_DAY = 0;
const MONTHLY_REMINDER_DAY = 1;

const DEFAULT_BACKUP_REMINDER_PREFERENCES: BackupReminderPreferences = {
  reminderSchedule: "weekly",
  lastBackupDate: null,
  lastBackupMode: null,
  bannerLastShownDate: null,
};

const INSTALL_MARKER_VALIDATORS: [keyof InstallMarker, (parsed: Partial<InstallMarker>) => boolean][] = [
  [
    "installedAt",
    (p) => typeof p.installedAt === "string" && !Number.isNaN(Date.parse(p.installedAt)),
  ],
  [
    "lastSeenAt",
    (p) => typeof p.lastSeenAt === "string" && !Number.isNaN(Date.parse(p.lastSeenAt)),
  ],
  [
    "lastSeenExpenseCount",
    (p) =>
      typeof p.lastSeenExpenseCount === "number" &&
      Number.isFinite(p.lastSeenExpenseCount) &&
      p.lastSeenExpenseCount >= 0,
  ],
];

const WHATS_NEW_VALIDATORS: [keyof WhatsNewState, (parsed: Partial<WhatsNewState>) => boolean][] = [
  [
    "lastSeenVersion",
    (p) => typeof p.lastSeenVersion === "string" && /^\d+\.\d+\.\d+$/.test(p.lastSeenVersion),
  ],
  [
    "lastSeenAt",
    (p) => typeof p.lastSeenAt === "string" && !Number.isNaN(Date.parse(p.lastSeenAt)),
  ],
];

class UserPreferences {
  private getStorage(): Storage | null {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  }

  private getItem(key: string): string | null {
    const storage = this.getStorage();
    if (!storage) return null;

    try {
      return storage.getItem(key);
    } catch {
      return null;
    }
  }

  private setItem(key: string, value: string): void {
    const storage = this.getStorage();
    if (!storage) return;

    try {
      storage.setItem(key, value);
    } catch {
      return;
    }
  }

  getCurrencyCode(fallback: string): string {
    return this.getItem(STORAGE_KEYS.currency) || fallback;
  }

  setCurrencyCode(code: string): void {
    this.setItem(STORAGE_KEYS.currency, code);
  }

  getTheme(fallback: Theme): Theme {
    return pickEnum(this.getItem(STORAGE_KEYS.theme), ["light", "dark", "system"] as const, fallback);
  }

  setTheme(theme: Theme): void {
    this.setItem(STORAGE_KEYS.theme, theme);
  }

  getBackupReminderPreferences(): BackupReminderPreferences {
    const rawValue = this.getItem(STORAGE_KEYS.backupReminder);
    if (!rawValue) return DEFAULT_BACKUP_REMINDER_PREFERENCES;

    try {
      const parsed = JSON.parse(rawValue) as Partial<BackupReminderPreferences>;
      const schedule = isReminderSchedule(parsed.reminderSchedule)
        ? parsed.reminderSchedule
        : DEFAULT_BACKUP_REMINDER_PREFERENCES.reminderSchedule;

      const rawMode = parsed.lastBackupMode;
      const lastBackupMode = rawMode === "device" || rawMode === "drive" ? rawMode : null;

      return {
        reminderSchedule: schedule,
        lastBackupDate: pickString(parsed.lastBackupDate, null),
        lastBackupMode,
        bannerLastShownDate: pickString(parsed.bannerLastShownDate, null),
      };
    } catch {
      return DEFAULT_BACKUP_REMINDER_PREFERENCES;
    }
  }

  setBackupReminderPreferences(preferences: BackupReminderPreferences): BackupReminderPreferences {
    this.setItem(STORAGE_KEYS.backupReminder, JSON.stringify(preferences));
    return preferences;
  }

  updateBackupReminderPreferences(
    partialPreferences: Partial<BackupReminderPreferences>,
  ): BackupReminderPreferences {
    const currentPreferences = this.getBackupReminderPreferences();
    const nextPreferences: BackupReminderPreferences = {
      ...currentPreferences,
      ...partialPreferences,
    };

    return this.setBackupReminderPreferences(nextPreferences);
  }

  getInstallMarker(): InstallMarker | null {
    const rawValue = this.getItem(STORAGE_KEYS.install);
    if (!rawValue) return null;

    try {
      const parsed = JSON.parse(rawValue) as Partial<InstallMarker> | null;
      if (!parsed) return null;

      const isValid = INSTALL_MARKER_VALIDATORS.every(([, isFieldValid]) => isFieldValid(parsed));
      return isValid ? (parsed as InstallMarker) : null;
    } catch {
      return null;
    }
  }

  setInstallMarker(marker: InstallMarker): void {
    this.setItem(STORAGE_KEYS.install, JSON.stringify(marker));
  }

  getWhatsNewState(): WhatsNewState | null {
    const rawValue = this.getItem(STORAGE_KEYS.whatsNew);
    if (!rawValue) return null;

    try {
      const parsed = JSON.parse(rawValue) as Partial<WhatsNewState> | null;
      if (!parsed) return null;

      const isValid = WHATS_NEW_VALIDATORS.every(([, isFieldValid]) => isFieldValid(parsed));
      return isValid ? (parsed as WhatsNewState) : null;
    } catch {
      return null;
    }
  }

  setWhatsNewState(state: WhatsNewState): void {
    this.setItem(STORAGE_KEYS.whatsNew, JSON.stringify(state));
  }

  clearAll(): void {
    const storage = this.getStorage();
    if (!storage) return;

    try {
      storage.clear();
    } catch {
      return;
    }
  }
}

export const userPreferences = new UserPreferences();

export { WEEKLY_REMINDER_DAY, MONTHLY_REMINDER_DAY };
