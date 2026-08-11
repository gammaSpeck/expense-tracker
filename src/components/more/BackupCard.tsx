import { BackupData } from "@/components/more/BackupData";
import { useDriveConnection } from "@/hooks/useDriveConnection";
import { useBackupReminderSchedule } from "@/hooks/useBackupReminderSchedule";
import { ReminderScheduleSelect } from "@/components/more/backup/ReminderScheduleSelect";
import { DriveConnectionRow } from "@/components/more/backup/DriveConnectionRow";

interface BackupCardProps {
  openOnMount?: boolean;
  onBackupSuccess?: () => void;
}

export function BackupCard({ openOnMount = false, onBackupSuccess }: BackupCardProps) {
  const { schedule, lastBackupText, handleScheduleChange } = useBackupReminderSchedule();
  const { creds, driveConnected, isUnlinking, handleUnlink } = useDriveConnection();

  return (
    <div className="space-y-1">
      <h2 className="text-sm font-semibold">Backup</h2>
      <p className="text-xs text-muted-foreground pb-3">{lastBackupText}</p>

      {/* Reminder frequency row */}
      <div className="flex items-center justify-between py-2">
        <span className="text-sm">Reminders</span>
        <ReminderScheduleSelect schedule={schedule} onChange={handleScheduleChange} />
      </div>

      {/* Google Drive status row */}
      <DriveConnectionRow creds={creds} isUnlinking={isUnlinking} onUnlink={handleUnlink} />

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
