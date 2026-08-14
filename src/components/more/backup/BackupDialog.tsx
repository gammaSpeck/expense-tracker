import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { initiateGoogleAuth } from "@/lib/driveAuth";
import { BackupTargetToggle } from "@/components/more/backup/BackupTargetToggle";

interface BackupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saveTo: "device" | "drive";
  setSaveTo: (target: "device" | "drive") => void;
  driveConnected: boolean;
  isBackingUp: boolean;
  onBackup: () => void;
}

export function BackupDialog({
  open,
  onOpenChange,
  saveTo,
  setSaveTo,
  driveConnected,
  isBackingUp,
  onBackup,
}: BackupDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-left">
          <DialogTitle>Backup</DialogTitle>
          <DialogDescription>
            Save a full JSON backup of your expenses and categories.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-green-500 shrink-0" />
            Backups are end-to-end encrypted (.extrack)
          </div>

          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Save to</Label>
            <BackupTargetToggle
              saveTo={saveTo}
              onChange={setSaveTo}
              driveConnected={driveConnected}
              onConnectDrive={() => initiateGoogleAuth()}
            />
          </div>

          <Button onClick={onBackup} disabled={isBackingUp} className="w-full">
            {isBackingUp ? "Saving…" : "Create Backup"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
