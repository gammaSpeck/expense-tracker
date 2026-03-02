import { useMemo, useState } from "react";
import {
  getBackupReminderPreferences,
  getDaysSinceLastBackup,
  setBackupReminderSchedule,
} from "@/lib/backupReminder";
import { type BackupReminderSchedule } from "@/lib/userPreferences";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const OPTIONS: Array<{
  value: BackupReminderSchedule;
  label: string;
}> = [
  {
    value: "never",
    label: "Never",
  },
  {
    value: "daily",
    label: "Daily",
  },
  {
    value: "weekly",
    label: "Weekly",
  },
  {
    value: "monthly",
    label: "Monthly",
  },
];

export function BackupReminderSettings() {
  const initialPreferences = getBackupReminderPreferences();
  const [schedule, setSchedule] = useState<BackupReminderSchedule>(
    initialPreferences.reminderSchedule,
  );
  const [lastBackupDate, setLastBackupDate] = useState<string | null>(
    initialPreferences.lastBackupDate,
  );

  const lastBackupText = useMemo(() => {
    const daysSince = getDaysSinceLastBackup(lastBackupDate);

    if (daysSince === null) return "Last backed up: never";
    if (daysSince === 0) return "Last backed up: today";
    return `Last backed up: ${daysSince} day${daysSince === 1 ? "" : "s"} ago`;
  }, [lastBackupDate]);

  const scheduleHelperText = useMemo(() => {
    switch (schedule) {
      case "never":
        return "Reminders are turned off.";
      case "daily":
        return "Daily reminders show on first app open each day.";
      case "weekly":
        return "Weekly reminders run on Sunday.";
      case "monthly":
        return "Monthly reminders run on the 1st.";
      default:
        return "";
    }
  }, [schedule]);

  const handleScheduleChange = (nextSchedule: BackupReminderSchedule) => {
    const updated = setBackupReminderSchedule(nextSchedule);
    setSchedule(updated.reminderSchedule);
    setLastBackupDate(updated.lastBackupDate);
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <h2 className="text-sm font-medium">Backup Reminders</h2>
        <p className="text-xs text-muted-foreground">
          Choose how often the app reminds you to export a backup.
        </p>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-border/50 px-3 py-2.5">
        <div className="text-sm font-medium">Frequency</div>
        <Select
          value={schedule}
          onValueChange={(value) =>
            handleScheduleChange(value as BackupReminderSchedule)
          }
        >
          <SelectTrigger className="h-8 w-32 text-xs">
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            {OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <p className="text-xs text-muted-foreground">{lastBackupText}</p>
      <p className="text-xs text-muted-foreground">{scheduleHelperText}</p>
    </div>
  );
}
