import { useEffect, useRef, useState } from "react";
import type { NavigateFunction } from "react-router";
import { exchangeCodeForTokens } from "@/lib/driveAuth";
import { getUserEmail, findOrCreateBackupFolder } from "@/lib/driveApi";
import { saveDriveCredentials } from "@/db/driveCredentials";

export type OAuthCallbackStatus = "loading" | "error";

async function runOAuthCallback(
  navigate: NavigateFunction,
  setStatus: (status: OAuthCallbackStatus) => void,
  setErrorMessage: (message: string) => void,
) {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  const error = params.get("error");

  if (error) {
    setErrorMessage(
      error === "access_denied"
        ? "You declined Google Drive access. You can connect anytime from Settings."
        : `Google returned an error: ${error}`,
    );
    setStatus("error");
    return;
  }

  if (!code) {
    setErrorMessage("No authorization code received. Please try again.");
    setStatus("error");
    return;
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    const accessToken = tokens.access_token;
    const expiresAt = Date.now() + tokens.expires_in * 1000;

    const [email, folderID] = await Promise.all([
      getUserEmail(accessToken),
      findOrCreateBackupFolder(accessToken),
    ]);

    await saveDriveCredentials({
      accessToken,
      refreshToken: tokens.refresh_token,
      expiresAt,
      folderID,
      accountEmail: email,
    });

    navigate("/settings/data", { replace: true });
  } catch (err) {
    setErrorMessage(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    setStatus("error");
  }
}

export function useGoogleOAuthCallback(navigate: NavigateFunction) {
  const [status, setStatus] = useState<OAuthCallbackStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  // Guard against React Strict Mode double-invoke in dev
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    runOAuthCallback(navigate, setStatus, setErrorMessage);
  }, [navigate]);

  return { status, errorMessage };
}
