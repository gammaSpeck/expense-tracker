import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { Archive, HardDrive, CloudUpload, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { exportAllData } from "@/db/expenseTrackerDb";
import { markBackupCompleted, getStoredPassphrase, encryptData } from "@/lib/backup";
import { SetupPassphraseDialog } from "@/components/more/EncryptionSettings";
import { toast } from "sonner";
import { isDriveConnected, getDriveCredentials, saveDriveCredentials } from "@/db/driveCredentials";
import { getValidAccessToken, DriveSessionExpiredError, initiateGoogleAuth } from "@/lib/driveAuth";
import { uploadFileToDrive, findOrCreateBackupFolder } from "@/lib/driveApi";

interface BackupDataProps {
  openOnMount?: boolean;
  onSuccess?: () => void;
  driveConnected?: boolean;
}

export function BackupData({
  openOnMount = false,
  onSuccess,
  driveConnected: driveConnectedProp,
}: BackupDataProps) {
  const [open, setOpen] = useState(false);
  const [saveTo, setSaveTo] = useState<"device" | "drive">("device");
  const [isBackingUp, setIsBackingUp] = useState(false);
  const hasAutoOpenedRef = useRef(false);
  const [internalDriveConnected, setInternalDriveConnected] = useState(false);
  const [passphraseSetupOpen, setPassphraseSetupOpen] = useState(false);

  // Use externally-provided state when available, otherwise check independently
  const driveConnected =
    driveConnectedProp !== undefined ? driveConnectedProp : internalDriveConnected;

  useEffect(() => {
    if (driveConnectedProp !== undefined) return;
    isDriveConnected().then(setInternalDriveConnected);
  }, [driveConnectedProp]);

  // Reset saveTo to device if Drive gets disconnected while dialog is open
  useEffect(() => {
    if (!driveConnected) setSaveTo("device");
  }, [driveConnected]);
  async function handleOpenBackup() {
    const passphrase = await getStoredPassphrase();
    if (!passphrase) {
      setPassphraseSetupOpen(true);
    } else {
      setOpen(true);
    }
  }

  useEffect(() => {
    if (!openOnMount || hasAutoOpenedRef.current) return;
    hasAutoOpenedRef.current = true;
    handleOpenBackup();
  }, [openOnMount]);

  const resetForm = () => {
    setSaveTo("device");
  };

  async function handleBackup() {
    setIsBackingUp(true);
    try {
      const data = await exportAllData();
      const dateToken = format(new Date(), "yyyy-MM-dd");
      const filename = `extrack-backup-${dateToken}.extrack`;

      const plainJson = JSON.stringify(
        {
          exportDate: new Date().toISOString(),
          version: "1.0",
          expenses: data.expenses,
          categories: data.categories,
        },
        null,
        2,
      );

      const encrypted = await encryptData(plainJson);

      if (saveTo === "drive") {
        let accessToken: string;
        try {
          accessToken = await getValidAccessToken();
        } catch (err) {
          const message =
            err instanceof DriveSessionExpiredError
              ? "Google Drive session expired. Please reconnect."
              : "Could not connect to Google Drive. Please reconnect.";
          toast.error(message, {
            action: {
              label: "Go to Settings",
              onClick: () => (window.location.href = "/settings/data"),
            },
          });
          return;
        }

        const blob = new Blob([encrypted], {
          type: "application/octet-stream",
        });
        const creds = await getDriveCredentials();
        if (!creds) return;
        const folderID = await findOrCreateBackupFolder(accessToken);

        if (folderID !== creds.folderID) {
          await saveDriveCredentials({ ...creds, folderID });
        }

        const { webViewLink } = await uploadFileToDrive(blob, filename, folderID, accessToken);

        markBackupCompleted("drive");
        toast.success("Backup saved to Google Drive", {
          action: {
            label: "View in Drive ↗",
            onClick: () => window.open(webViewLink, "_blank"),
          },
        });
      } else {
        const blob = new Blob([encrypted], {
          type: "application/octet-stream",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);

        markBackupCompleted("device");
        toast.success("Backup saved to device");
      }

      resetForm();
      setOpen(false);
      onSuccess?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Backup failed");
    } finally {
      setIsBackingUp(false);
    }
  }

  return (
    <>
      <Button onClick={handleOpenBackup} variant="outline" className="w-full justify-start">
        <Archive className="h-4 w-4 mr-2" />
        Create Backup
      </Button>

      {/* Passphrase setup gate — shown when backup is attempted without a passphrase */}
      <SetupPassphraseDialog
        open={passphraseSetupOpen}
        onClose={() => setPassphraseSetupOpen(false)}
        onSuccess={() => {
          setPassphraseSetupOpen(false);
          setOpen(true);
        }}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-left">
            <DialogTitle>Backup</DialogTitle>
            <DialogDescription>
              Save a full JSON backup of your expenses and categories.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Encryption notice */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-green-500 shrink-0" />
              Backups are end-to-end encrypted (.extrack)
            </div>

            {/* Save To */}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Save to</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setSaveTo("device")}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all ${
                    saveTo === "device"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80"
                  }`}
                >
                  <HardDrive className="h-4 w-4" />
                  Device
                </button>
                {driveConnected ? (
                  <button
                    onClick={() => setSaveTo("drive")}
                    className={`flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all ${
                      saveTo === "drive"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-muted/80"
                    }`}
                  >
                    <CloudUpload className="h-4 w-4" />
                    Google Drive
                  </button>
                ) : (
                  <button
                    onClick={() => initiateGoogleAuth()}
                    className="flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all bg-muted hover:bg-muted/80 text-sm"
                  >
                    <CloudUpload className="h-4 w-4" />
                    Connect Drive
                  </button>
                )}
              </div>
            </div>

            <Button onClick={handleBackup} disabled={isBackingUp} className="w-full">
              {isBackingUp ? "Saving…" : "Create Backup"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
