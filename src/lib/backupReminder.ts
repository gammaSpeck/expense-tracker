import { differenceInCalendarDays, format, isValid, parseISO } from "date-fns";
import {
  type BackupReminderPreferences,
  type BackupReminderSchedule,
  MONTHLY_REMINDER_DAY,
  WEEKLY_REMINDER_DAY,
  userPreferences,
} from "@/db/userPreferences";

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

export function markBackupCompleted(now: Date = new Date()): BackupReminderPreferences {
  return userPreferences.updateBackupReminderPreferences({
    lastBackupDate: toDateKey(now),
  });
}

export function setBackupReminderSchedule(
  reminderSchedule: BackupReminderSchedule,
): BackupReminderPreferences {
  return userPreferences.updateBackupReminderPreferences({ reminderSchedule });
}
