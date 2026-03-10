import { get, set, del, createStore } from "idb-keyval";

const store = createStore("expense-tracker-drive", "credentials");

export interface DriveCredentials {
  accessToken: string;
  refreshToken: string;
  /** Unix timestamp (ms) when the access token expires */
  expiresAt: number;
  folderID: string;
  accountEmail: string;
}

export async function getDriveCredentials(): Promise<DriveCredentials | null> {
  return (await get<DriveCredentials>("creds", store)) ?? null;
}

export async function saveDriveCredentials(creds: DriveCredentials): Promise<void> {
  await set("creds", creds, store);
}

export async function clearDriveCredentials(): Promise<void> {
  await del("creds", store);
}

/**
 * Returns true if an access token exists but will expire within 60 seconds.
 */
export function isTokenExpired(creds: DriveCredentials): boolean {
  return Date.now() >= creds.expiresAt - 60_000;
}

export async function isDriveConnected(): Promise<boolean> {
  return (await getDriveCredentials()) !== null;
}
