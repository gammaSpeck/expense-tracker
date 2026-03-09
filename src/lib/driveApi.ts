const DRIVE_API = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";
const BACKUP_FOLDER_NAME = "ExTrack Backups";

/**
 * Escapes a value for use inside a single-quoted Drive Files.list query string.
 * Google's query language requires backslash-escaping both `\` and `'`.
 */
function escapeDriveQuery(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

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
    `name = '${escapeDriveQuery(BACKUP_FOLDER_NAME)}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
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
 * Searches for an existing file by name inside a specific folder.
 * Returns the file ID if found, null otherwise.
 */
async function findExistingFile(
  filename: string,
  folderID: string,
  accessToken: string,
): Promise<string | null> {
  const query = encodeURIComponent(
    `name = '${escapeDriveQuery(filename)}' and '${escapeDriveQuery(folderID)}' in parents and mimeType = 'application/json' and trashed = false`,
  );
  const res = await fetch(`${DRIVE_API}/files?q=${query}&fields=files(id)`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      err?.error?.message ?? `Drive file search failed (${res.status})`,
    );
  }
  const data = await res.json();
  const files = data.files as { id: string }[];
  return files.length > 0 ? files[0].id : null;
}

/**
 * Uploads a JSON blob to the given Drive folder.
 * If a file with the same name already exists in the folder, it is replaced
 * (PATCH) rather than creating a duplicate. Returns the file ID and webViewLink.
 */
export async function uploadFileToDrive(
  blob: Blob,
  filename: string,
  folderID: string,
  accessToken: string,
): Promise<UploadResult> {
  const existingFileId = await findExistingFile(
    filename,
    folderID,
    accessToken,
  );

  const body = new FormData();
  body.append(
    "metadata",
    new Blob(
      [JSON.stringify({ name: filename, mimeType: "application/json" })],
      {
        type: "application/json",
      },
    ),
  );
  body.append("file", blob);

  let res: Response;

  if (existingFileId) {
    // Update existing file — no `parents` in metadata for PATCH
    res = await fetch(
      `${DRIVE_UPLOAD_API}/files/${existingFileId}?uploadType=multipart&fields=id,webViewLink`,
      {
        method: "PATCH",
        headers: { Authorization: `Bearer ${accessToken}` },
        body,
      },
    );
  } else {
    // Create new file
    body.set(
      "metadata",
      new Blob(
        [
          JSON.stringify({
            name: filename,
            mimeType: "application/json",
            parents: [folderID],
          }),
        ],
        { type: "application/json" },
      ),
    );
    res = await fetch(
      `${DRIVE_UPLOAD_API}/files?uploadType=multipart&fields=id,webViewLink`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body,
      },
    );
  }

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
