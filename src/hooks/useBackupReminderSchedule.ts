import { useMemo, useState } from "react";
import { getBackupReminderPreferences, getDaysSinceLastBackup, setBackupReminderSchedule } from "@/lib/backup";
import { type BackupReminderSchedule } from "@/db/userPreferences";

export function useBackupReminderSchedule() {
  const initialPrefs = getBackupReminderPreferences();
  const [schedule, setSchedule] = useState<BackupReminderSchedule>(initialPrefs.reminderSchedule);
  const [lastBackupDate, setLastBackupDate] = useState<string | null>(initialPrefs.lastBackupDate);
  const [lastBackupMode, setLastBackupMode] = useState(initialPrefs.lastBackupMode);

  const lastBackupText = useMemo(() => {
    const daysSince = getDaysSinceLastBackup(lastBackupDate);
    if (daysSince === null) return "Last backed up: never";
    const dateText = daysSince === 0 ? "today" : `${daysSince} day${daysSince === 1 ? "" : "s"} ago`;
    const modeSuffix =
      lastBackupMode === "device" ? " · Device" : lastBackupMode === "drive" ? " · Google Drive" : "";
    return `Last backed up: ${dateText}${modeSuffix}`;
  }, [lastBackupDate, lastBackupMode]);

  function handleScheduleChange(next: BackupReminderSchedule) {
    const updated = setBackupReminderSchedule(next);
    setSchedule(updated.reminderSchedule);
    setLastBackupDate(updated.lastBackupDate);
    setLastBackupMode(updated.lastBackupMode);
  }

  return { schedule, lastBackupText, handleScheduleChange };
}
