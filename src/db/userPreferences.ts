import { Theme } from "@/types/expense";

export type BackupReminderSchedule = "never" | "daily" | "weekly" | "monthly";

export interface BackupReminderPreferences {
  reminderSchedule: BackupReminderSchedule;
  lastBackupDate: string | null;
  bannerLastShownDate: string | null;
}

const STORAGE_KEYS = {
  currency: "expense-tracker-currency",
  theme: "expense-tracker-theme",
  backupReminder: "expense-tracker-backup-reminder",
} as const;

const WEEKLY_REMINDER_DAY = 0;
const MONTHLY_REMINDER_DAY = 1;

const DEFAULT_BACKUP_REMINDER_PREFERENCES: BackupReminderPreferences = {
  reminderSchedule: "weekly",
  lastBackupDate: null,
  bannerLastShownDate: null,
};

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
    const value = this.getItem(STORAGE_KEYS.theme) as Theme | null;
    if (!value) return fallback;

    if (value === "light" || value === "dark" || value === "system") {
      return value;
    }

    return fallback;
  }

  setTheme(theme: Theme): void {
    this.setItem(STORAGE_KEYS.theme, theme);
  }

  getBackupReminderPreferences(): BackupReminderPreferences {
    const rawValue = this.getItem(STORAGE_KEYS.backupReminder);
    if (!rawValue) return DEFAULT_BACKUP_REMINDER_PREFERENCES;

    try {
      const parsed = JSON.parse(rawValue) as Partial<BackupReminderPreferences>;
      const reminderSchedule = parsed.reminderSchedule;
      const schedule =
        reminderSchedule === "never" ||
        reminderSchedule === "daily" ||
        reminderSchedule === "weekly" ||
        reminderSchedule === "monthly"
          ? reminderSchedule
          : DEFAULT_BACKUP_REMINDER_PREFERENCES.reminderSchedule;

      return {
        reminderSchedule: schedule,
        lastBackupDate: typeof parsed.lastBackupDate === "string" ? parsed.lastBackupDate : null,
        bannerLastShownDate:
          typeof parsed.bannerLastShownDate === "string" ? parsed.bannerLastShownDate : null,
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

export {
  STORAGE_KEYS,
  DEFAULT_BACKUP_REMINDER_PREFERENCES,
  WEEKLY_REMINDER_DAY,
  MONTHLY_REMINDER_DAY,
};
