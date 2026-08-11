import { CloudUpload, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { initiateGoogleAuth } from "@/lib/driveAuth";
import { BACKUP_FOLDER_NAME } from "@/lib/driveApi";
import type { DriveCredentials } from "@/db/driveCredentials";
import { UnlinkDriveConfirmDialog } from "@/components/more/backup/UnlinkDriveConfirmDialog";

interface DriveConnectionRowProps {
  creds: DriveCredentials | null;
  isUnlinking: boolean;
  onUnlink: () => void;
}

export function DriveConnectionRow({ creds, isUnlinking, onUnlink }: DriveConnectionRowProps) {
  const driveConnected = creds !== null;

  return (
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
        <UnlinkDriveConfirmDialog isUnlinking={isUnlinking} onConfirm={onUnlink} />
      ) : (
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => initiateGoogleAuth()}>
          <Link2 className="h-3 w-3 mr-1" />
          Connect
        </Button>
      )}
    </div>
  );
}
