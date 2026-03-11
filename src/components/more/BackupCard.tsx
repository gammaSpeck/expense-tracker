import { useEffect, useMemo, useState } from "react";
import { CloudUpload, Link2, Link2Off, Loader2 } from "lucide-react";
import {
  getBackupReminderPreferences,
  getDaysSinceLastBackup,
  setBackupReminderSchedule,
} from "@/lib/backupReminder";
import { type BackupReminderSchedule } from "@/db/userPreferences";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  getDriveCredentials,
  clearDriveCredentials,
  type DriveCredentials,
} from "@/db/driveCredentials";
import { initiateGoogleAuth, revokeToken } from "@/lib/driveAuth";
import { toast } from "sonner";
import { BackupData } from "@/components/more/BackupData";
import { BACKUP_FOLDER_NAME } from "@/lib/driveApi";

const SCHEDULE_OPTIONS: Array<{
  value: BackupReminderSchedule;
  label: string;
}> = [
  { value: "never", label: "Never" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

interface BackupCardProps {
  openOnMount?: boolean;
  onBackupSuccess?: () => void;
}

export function BackupCard({ openOnMount = false, onBackupSuccess }: BackupCardProps) {
  const initialPrefs = getBackupReminderPreferences();
  const [schedule, setSchedule] = useState<BackupReminderSchedule>(initialPrefs.reminderSchedule);
  const [lastBackupDate, setLastBackupDate] = useState<string | null>(initialPrefs.lastBackupDate);
  const [lastBackupMode, setLastBackupMode] = useState(initialPrefs.lastBackupMode);
  const [creds, setCreds] = useState<DriveCredentials | null>(null);
  const [isUnlinking, setIsUnlinking] = useState(false);

  useEffect(() => {
    getDriveCredentials().then(setCreds);
  }, []);

  const lastBackupText = useMemo(() => {
    const daysSince = getDaysSinceLastBackup(lastBackupDate);
    if (daysSince === null) return "Last backed up: never";
    const dateText =
      daysSince === 0 ? "today" : `${daysSince} day${daysSince === 1 ? "" : "s"} ago`;
    const modeSuffix =
      lastBackupMode === "device"
        ? " · Device"
        : lastBackupMode === "drive"
          ? " · Google Drive"
          : "";
    return `Last backed up: ${dateText}${modeSuffix}`;
  }, [lastBackupDate, lastBackupMode]);

  function handleScheduleChange(next: BackupReminderSchedule) {
    const updated = setBackupReminderSchedule(next);
    setSchedule(updated.reminderSchedule);
    setLastBackupDate(updated.lastBackupDate);
    setLastBackupMode(updated.lastBackupMode);
  }

  async function handleUnlink() {
    setIsUnlinking(true);
    const snapshot = creds;
    await clearDriveCredentials();
    setCreds(null);
    try {
      if (snapshot) await revokeToken(snapshot.refreshToken);
    } finally {
      setIsUnlinking(false);
      toast.success("Google Drive disconnected.");
    }
  }

  const driveConnected = creds !== null;

  return (
    <div className="space-y-1">
      <h2 className="text-sm font-semibold">Backup</h2>
      <p className="text-xs text-muted-foreground pb-3">{lastBackupText}</p>

      {/* Reminder frequency row */}
      <div className="flex items-center justify-between py-2">
        <span className="text-sm">Reminders</span>
        <Select
          value={schedule}
          onValueChange={(v) => handleScheduleChange(v as BackupReminderSchedule)}
        >
          <SelectTrigger className="h-8 w-32 text-xs">
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            {SCHEDULE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Google Drive status row */}
      <div className="flex items-center justify-between py-2">
        <div className="flex items-center gap-2">
          <CloudUpload className="h-4 w-4 text-muted-foreground shrink-0" />
          <div>
            <span className="text-sm">Google Drive</span>
            {driveConnected ? (
              <div>
                <p className="text-xs text-muted-foreground">{creds!.accountEmail}</p>
                <p className="text-xs text-muted-foreground">
                  Folder: <span className="text-primary">{BACKUP_FOLDER_NAME}</span>
                </p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Not connected</p>
            )}
          </div>
        </div>

        {driveConnected ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                disabled={isUnlinking}
              >
                {isUnlinking ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                ) : (
                  <Link2Off className="h-3 w-3 mr-1" />
                )}
                Unlink
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Disconnect Google Drive?</AlertDialogTitle>
                <AlertDialogDescription>
                  This removes your Google account from ExTrack. Existing backups in Drive will not
                  be deleted — you can reconnect anytime.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={handleUnlink}
                >
                  Disconnect
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => initiateGoogleAuth()}
          >
            <Link2 className="h-3 w-3 mr-1" />
            Connect
          </Button>
        )}
      </div>

      {/* Create backup */}
      <div className="pt-1">
        <BackupData
          openOnMount={openOnMount}
          onSuccess={onBackupSuccess}
          driveConnected={driveConnected}
        />
      </div>
    </div>
  );
}
