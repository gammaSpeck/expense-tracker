const DRIVE_API = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";
const BACKUP_FOLDER_NAME = "ExTrack Backups";

// ---------------------------------------------------------------------------
// User info
// ---------------------------------------------------------------------------

export async function getUserEmail(accessToken: string): Promise<string> {
  const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("Failed to fetch Google user info.");
  const data = await res.json();
  return data.email as string;
}

// ---------------------------------------------------------------------------
// Folder management — find or create `ExTrack Backups`
// ---------------------------------------------------------------------------

async function findBackupFolder(accessToken: string): Promise<string | null> {
  const query = encodeURIComponent(
    `name = '${BACKUP_FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
  );
  const res = await fetch(
    `${DRIVE_API}/files?q=${query}&fields=files(id,name)`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
  if (!res.ok) throw new Error("Failed to search for backup folder in Drive.");
  const data = await res.json();
  const files = data.files as { id: string; name: string }[];
  return files.length > 0 ? files[0].id : null;
}

async function createBackupFolder(accessToken: string): Promise<string> {
  const res = await fetch(`${DRIVE_API}/files`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: BACKUP_FOLDER_NAME,
      mimeType: "application/vnd.google-apps.folder",
    }),
  });
  if (!res.ok) throw new Error("Failed to create backup folder in Drive.");
  const data = await res.json();
  return data.id as string;
}

/**
 * Returns the folder ID for `ExTrack Backups`, creating it if it doesn't exist.
 */
export async function findOrCreateBackupFolder(
  accessToken: string,
): Promise<string> {
  const existing = await findBackupFolder(accessToken);
  if (existing) return existing;
  return createBackupFolder(accessToken);
}

// ---------------------------------------------------------------------------
// File upload
// ---------------------------------------------------------------------------

export interface UploadResult {
  fileId: string;
  webViewLink: string;
}

/**
 * Uploads a JSON blob to the given Drive folder using multipart upload.
 * Returns the file ID and a direct link to view it in Drive.
 */
export async function uploadFileToDrive(
  blob: Blob,
  filename: string,
  folderID: string,
  accessToken: string,
): Promise<UploadResult> {
  const metadata = {
    name: filename,
    mimeType: "application/json",
    parents: [folderID],
  };

  const body = new FormData();
  body.append(
    "metadata",
    new Blob([JSON.stringify(metadata)], { type: "application/json" }),
  );
  body.append("file", blob);

  const res = await fetch(
    `${DRIVE_UPLOAD_API}/files?uploadType=multipart&fields=id,webViewLink`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body,
    },
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? "Failed to upload file to Drive.");
  }

  const data = await res.json();
  return {
    fileId: data.id as string,
    webViewLink: data.webViewLink as string,
  };
}
