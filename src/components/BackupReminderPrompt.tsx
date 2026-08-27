import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  getBackupReminderPreferences,
  getDaysSinceLastBackup,
  markBackupReminderBannerShown,
  shouldShowBackupReminderBanner,
  toDateKey,
} from "@/lib/backup";
import { type BackupReminderSchedule } from "@/db/userPreferences";
import { BackupReminderBanner } from "@/components/BackupReminderBanner";

type PromptState = {
  visible: boolean;
  schedule: BackupReminderSchedule;
  message: string;
};

function getScheduleLabel(schedule: BackupReminderSchedule): string {
  switch (schedule) {
    case "daily":
      return "daily";
    case "weekly":
      return "weekly";
    case "monthly":
      return "monthly";
    case "never":
      return "scheduled";
    default:
      return "scheduled";
  }
}

function getLastBackupText(daysSinceLastBackup: number | null): string {
  if (daysSinceLastBackup === null) return "Last backup: never.";
  if (daysSinceLastBackup === 0) return "Last backup: today.";

  return `Last backup: ${daysSinceLastBackup} day${daysSinceLastBackup === 1 ? "" : "s"} ago.`;
}

const AUTO_BACKUP_FAILURE_THRESHOLD = 3;

function getInitialPromptState(): PromptState {
  const preferences = getBackupReminderPreferences();

  // Sustained automatic-backup failure escalates to this same banner surface, gated by the
  // existing once-a-day bannerLastShownDate check — one banner, not a daily nag on top of it.
  if (
    preferences.autoBackupFailures >= AUTO_BACKUP_FAILURE_THRESHOLD &&
    preferences.bannerLastShownDate !== toDateKey(new Date())
  ) {
    return {
      visible: true,
      schedule: preferences.reminderSchedule,
      message: "Automatic backup has failed for 3 days in a row. Check your connection or Drive link.",
    };
  }

  const visible = shouldShowBackupReminderBanner(preferences);

  if (!visible) {
    return {
      visible: false,
      schedule: preferences.reminderSchedule,
      message: "",
    };
  }

  const scheduleLabel = getScheduleLabel(preferences.reminderSchedule);
  const daysSinceLastBackup = getDaysSinceLastBackup(preferences.lastBackupDate);

  return {
    visible: true,
    schedule: preferences.reminderSchedule,
    message: `Your ${scheduleLabel} backup is due. ${getLastBackupText(daysSinceLastBackup)}`,
  };
}

export function BackupReminderPrompt() {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);
  const [promptState] = useState<PromptState>(() => getInitialPromptState());

  useEffect(() => {
    if (promptState.visible) {
      markBackupReminderBannerShown();
    }
  }, [promptState.visible]);

  if (!promptState.visible || dismissed) return null;

  return (
    <BackupReminderBanner
      message={promptState.message}
      onBackupNow={() => {
        setDismissed(true);
        navigate("/settings/data", { state: { openBackup: true } });
      }}
      onDismiss={() => setDismissed(true)}
    />
  );
}
