import { toast } from "sonner";
import { markBackupCompleted } from "@/lib/backup";
import { downloadFile } from "@/lib/download";
import { capture } from "@/lib/telemetry";
import { getDriveCredentials, saveDriveCredentials } from "@/db/driveCredentials";
import { findOrCreateBackupFolder, uploadFileToDrive } from "@/lib/driveApi";

/**
 * Uploads an encrypted backup to Drive, re-resolving (never caching) the
 * backup folder ID on every call. Returns `null` if Drive credentials
 * vanished between the caller's connectivity check and this call — the
 * caller treats that as a silent no-op, matching prior behaviour.
 */
export async function uploadBackupToDrive(
  encrypted: string,
  filename: string,
  accessToken: string,
  expenseCount: number,
): Promise<{ webViewLink: string } | null> {
  const blob = new Blob([encrypted], { type: "application/octet-stream" });
  const creds = await getDriveCredentials();
  if (!creds) return null;
  const folderID = await findOrCreateBackupFolder(accessToken);

  if (folderID !== creds.folderID) {
    await saveDriveCredentials({ ...creds, folderID });
  }

  const { webViewLink } = await uploadFileToDrive(blob, filename, folderID, accessToken);

  markBackupCompleted("drive");
  capture("backup_succeeded", { target: "drive", expenseCount });
  return { webViewLink };
}

export function saveBackupToDevice(encrypted: string, filename: string, expenseCount: number): void {
  downloadFile(encrypted, filename, "application/octet-stream");

  markBackupCompleted("device");
  capture("backup_succeeded", { target: "device", expenseCount });
  toast.success("Backup saved to device");
}
