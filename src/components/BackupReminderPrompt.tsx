import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { BellRing, Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getBackupReminderPreferences,
  getDaysSinceLastBackup,
  markBackupReminderBannerShown,
  shouldShowBackupReminderBanner,
} from "@/lib/backup";
import { type BackupReminderSchedule } from "@/db/userPreferences";

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

function getInitialPromptState(): PromptState {
  const preferences = getBackupReminderPreferences();
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
    <div className="fixed bottom-20 left-4 right-4 z-60 animate-slide-in-up transition-all duration-300">
      <div className="mx-auto max-w-md">
        <div className="glass-card p-4 border-primary/30 shadow-2xl">
          <div className="flex items-start gap-3">
            <div className="shrink-0 mt-0.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
                <BellRing className="h-5 w-5 text-primary" />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-foreground mb-1">Backup reminder</h3>
              <p className="text-xs text-muted-foreground mb-3">{promptState.message}</p>

              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    setDismissed(true);
                    navigate("/settings/data", { state: { openBackup: true } });
                  }}
                  size="sm"
                  className="h-8 text-xs font-medium shadow-md hover:shadow-lg transition-all"
                >
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                  Backup Now
                </Button>
                <Button
                  onClick={() => setDismissed(true)}
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs font-medium"
                >
                  Later
                </Button>
              </div>
            </div>

            <button
              onClick={() => setDismissed(true)}
              className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="absolute bottom-0 left-0 right-0 h-1 bg-linear-to-r from-primary/0 via-primary to-primary/0 rounded-b-xl" />
        </div>
      </div>
    </div>
  );
}
