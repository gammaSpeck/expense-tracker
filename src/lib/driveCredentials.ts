const STORAGE_KEY = "expense-tracker-drive-credentials";

export interface DriveCredentials {
  accessToken: string;
  refreshToken: string;
  /** Unix timestamp (ms) when the access token expires */
  expiresAt: number;
  folderID: string;
  accountEmail: string;
}

export function getDriveCredentials(): DriveCredentials | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DriveCredentials;
  } catch {
    return null;
  }
}

export function saveDriveCredentials(creds: DriveCredentials): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(creds));
}

export function clearDriveCredentials(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Returns true if an access token exists but will expire within 60 seconds.
 */
export function isTokenExpired(creds: DriveCredentials): boolean {
  return Date.now() >= creds.expiresAt - 60_000;
}

export function isDriveConnected(): boolean {
  return getDriveCredentials() !== null;
}
