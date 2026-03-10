import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  getBackupReminderPreferences,
  getDaysSinceLastBackup,
  markBackupReminderBannerShown,
  shouldShowBackupReminderBanner,
} from "@/lib/backupReminder";

type BackupReminderBannerProps = {
  onBackupNow: () => void;
  onOpenSettings: () => void;
};

function scheduleLabel(schedule: "daily" | "weekly" | "monthly"): string {
  switch (schedule) {
    case "daily":
      return "daily";
    case "weekly":
      return "weekly";
    case "monthly":
      return "monthly";
  }
}

export function BackupReminderBanner({ onBackupNow, onOpenSettings }: BackupReminderBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  const [bannerState] = useState(() => {
    const preferences = getBackupReminderPreferences();
    const shouldShow = shouldShowBackupReminderBanner(preferences);

    if (!shouldShow) {
      return {
        shouldShow: false,
        message: "",
      };
    }

    const daysSinceBackup = getDaysSinceLastBackup(preferences.lastBackupDate);
    const schedule = preferences.reminderSchedule;

    const scheduleText =
      schedule === "daily" || schedule === "weekly" || schedule === "monthly"
        ? scheduleLabel(schedule)
        : "scheduled";

    const backupText =
      daysSinceBackup === null
        ? "Last backup: never"
        : daysSinceBackup === 0
          ? "Last backup: today"
          : `Last backup: ${daysSinceBackup} day${daysSinceBackup === 1 ? "" : "s"} ago`;

    return {
      shouldShow: true,
      message: `Your ${scheduleText} backup is due. ${backupText}.`,
    };
  });

  useEffect(() => {
    if (bannerState.shouldShow) {
      markBackupReminderBannerShown();
    }
  }, [bannerState.shouldShow]);

  const containerClass =
    "rounded-xl border border-border/60 bg-card px-4 py-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between";

  if (!bannerState.shouldShow || dismissed) return null;

  return (
    <div className={containerClass}>
      <p className="text-sm text-foreground">{bannerState.message}</p>
      <div className="flex gap-2">
        <Button size="sm" onClick={onBackupNow}>
          Backup Now
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            markBackupReminderBannerShown();
            setDismissed(true);
          }}
        >
          Dismiss
        </Button>
        <Button size="sm" variant="ghost" onClick={onOpenSettings}>
          Settings
        </Button>
      </div>
    </div>
  );
}
