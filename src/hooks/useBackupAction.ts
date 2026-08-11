// fallow-ignore-file security-sink
// The open-redirect candidate at `window.open(result.webViewLink, "_blank")`
// below is a false positive: webViewLink is not user input — it's the
// `webViewLink` field from uploadBackupToDrive's own authenticated Drive API
// response for the file this app just uploaded, always a
// https://drive.google.com/... URL.
import { useState } from "react";
import { exportAllData } from "@/db/expenseTrackerDb";
import { createEncryptedBackupFile } from "@/lib/backup";
import { captureError } from "@/lib/telemetry";
import { toast } from "sonner";
import { getValidAccessToken, DriveSessionExpiredError } from "@/lib/driveAuth";
import { uploadBackupToDrive, saveBackupToDevice } from "@/lib/backupTargets";

/**
 * Owns the "create backup" workflow: destination selection, the encrypt +
 * upload/save flow, and in-flight state. Kept separate from BackupData's JSX
 * so the dialog markup stays a plain presentational component.
 */
export function useBackupAction(onSuccess: (() => void) | undefined, onDone: () => void) {
  const [saveTo, setSaveTo] = useState<"device" | "drive">("device");
  const [isBackingUp, setIsBackingUp] = useState(false);

  async function handleBackup() {
    setIsBackingUp(true);
    try {
      const data = await exportAllData();
      const { filename, encrypted } = await createEncryptedBackupFile(data);

      if (saveTo === "drive") {
        let accessToken: string;
        try {
          accessToken = await getValidAccessToken();
        } catch (err) {
          const message =
            err instanceof DriveSessionExpiredError
              ? "Google Drive session expired. Please reconnect."
              : "Could not connect to Google Drive. Please reconnect.";
          captureError("backup_failed", err, { target: "drive", stage: "auth" });
          toast.error(message, {
            action: {
              label: "Go to Settings",
              onClick: () => (window.location.href = "/settings/data"),
            },
          });
          return;
        }

        const result = await uploadBackupToDrive(encrypted, filename, accessToken, data.expenses.length);
        if (!result) return;

        toast.success("Backup saved to Google Drive", {
          action: {
            label: "View in Drive ↗",
            onClick: () => window.open(result.webViewLink, "_blank"),
          },
        });
      } else {
        saveBackupToDevice(encrypted, filename, data.expenses.length);
      }

      setSaveTo("device");
      onDone();
      onSuccess?.();
    } catch (err) {
      captureError("backup_failed", err, { target: saveTo });
      toast.error(err instanceof Error ? err.message : "Backup failed");
    } finally {
      setIsBackingUp(false);
    }
  }

  return { saveTo, setSaveTo, isBackingUp, handleBackup };
}
