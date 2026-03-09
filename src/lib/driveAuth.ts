import {
  getDriveCredentials,
  saveDriveCredentials,
  clearDriveCredentials,
  isTokenExpired,
} from "../db/driveCredentials";

/**
 * Thrown by getValidAccessToken when the refresh token is invalid/revoked.
 * Callers should catch this, show a reconnect prompt, and never retry silently.
 * Local credentials are already cleared when this is thrown.
 */
export class DriveSessionExpiredError extends Error {
  constructor() {
    super("Google Drive session expired. Please reconnect.");
    this.name = "DriveSessionExpiredError";
  }
}

const CLIENT_ID = import.meta.env
  .VITE_GOOGLE_CLOUD_DRIVE_OAUTH2_CLIENT_ID as string;
// For Desktop app OAuth clients, client_secret is required by Google's token
// endpoint even with PKCE. This is not truly secret for Desktop app clients —
// PKCE provides the actual security guarantee.
const CLIENT_SECRET = import.meta.env
  .VITE_GOOGLE_CLOUD_DRIVE_OAUTH2_CLIENT_SECRET as string;
const SCOPES = "https://www.googleapis.com/auth/drive.file email profile";
const SESSION_VERIFIER_KEY = "expense-tracker-pkce-verifier";

// ---------------------------------------------------------------------------
// PKCE helpers
// ---------------------------------------------------------------------------

function base64urlEncode(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function generateCodeVerifier(): string {
  const array = new Uint8Array(64);
  crypto.getRandomValues(array);
  return base64urlEncode(array.buffer);
}

export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoded = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return base64urlEncode(digest);
}

// ---------------------------------------------------------------------------
// Auth URL builder — saves verifier to sessionStorage, redirects to Google
// ---------------------------------------------------------------------------

export async function initiateGoogleAuth(): Promise<void> {
  const verifier = generateCodeVerifier();
  const challenge = await generateCodeChallenge(verifier);
  sessionStorage.setItem(SESSION_VERIFIER_KEY, verifier);

  const redirectUri = `${window.location.origin}/oauth/callback`;

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES,
    code_challenge: challenge,
    code_challenge_method: "S256",
    access_type: "offline",
    prompt: "consent", // ensures refresh token is always issued
  });

  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

// ---------------------------------------------------------------------------
// Token exchange — called from the /oauth/callback page
// ---------------------------------------------------------------------------

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number; // seconds
}

export async function exchangeCodeForTokens(
  code: string,
): Promise<TokenResponse> {
  const verifier = sessionStorage.getItem(SESSION_VERIFIER_KEY);
  if (!verifier)
    throw new Error(
      "PKCE verifier missing from session. Please try connecting again.",
    );

  const redirectUri = `${window.location.origin}/oauth/callback`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
      code,
      code_verifier: verifier,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error_description ?? "Token exchange failed");
  }

  sessionStorage.removeItem(SESSION_VERIFIER_KEY); // clean up verifier
  return res.json() as Promise<TokenResponse>;
}

// ---------------------------------------------------------------------------
// Token refresh — called silently before every Drive API call
// ---------------------------------------------------------------------------

async function refreshAccessToken(
  refreshToken: string,
): Promise<{ accessToken: string; expiresAt: number }> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error_description ?? "Token refresh failed");
  }

  const data = await res.json();
  return {
    accessToken: data.access_token as string,
    expiresAt: Date.now() + (data.expires_in as number) * 1000,
  };
}

/**
 * Returns a valid access token, refreshing silently if the current one is
 * expired. Throws DriveSessionExpiredError (and clears local credentials) if
 * the refresh token is invalid or revoked — caller should prompt reconnect.
 */
export async function getValidAccessToken(): Promise<string> {
  const creds = await getDriveCredentials();
  if (!creds) throw new DriveSessionExpiredError();

  if (!isTokenExpired(creds)) return creds.accessToken;

  try {
    const { accessToken, expiresAt } = await refreshAccessToken(
      creds.refreshToken,
    );
    await saveDriveCredentials({ ...creds, accessToken, expiresAt });
    return accessToken;
  } catch {
    // Refresh token is invalid/revoked — wipe credentials so the app reflects
    // the disconnected state immediately, then signal callers to reconnect.
    await clearDriveCredentials();
    throw new DriveSessionExpiredError();
  }
}

// ---------------------------------------------------------------------------
// Revoke token — called on unlink
// ---------------------------------------------------------------------------

/**
 * Best-effort token revocation via POST body (tokens must not appear in URLs).
 * Silently ignores network/revoke failures — the token may already be expired
 * or revoked. Always clear local credentials regardless of this call's outcome.
 */
export async function revokeToken(token: string): Promise<void> {
  await fetch("https://oauth2.googleapis.com/revoke", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ token }),
  }).catch(() => {});
}
