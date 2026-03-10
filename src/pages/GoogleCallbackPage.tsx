import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { exchangeCodeForTokens } from "@/lib/driveAuth";
import { getUserEmail, findOrCreateBackupFolder } from "@/lib/driveApi";
import { saveDriveCredentials } from "@/db/driveCredentials";

type Status = "loading" | "error";

export default function GoogleCallbackPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  // Guard against React Strict Mode double-invoke in dev
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    async function handleCallback() {
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
        setErrorMessage(
          err instanceof Error ? err.message : "Something went wrong. Please try again.",
        );
        setStatus("error");
      }
    }

    handleCallback();
  }, [navigate]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Connecting Google Drive…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        <p className="text-sm font-medium text-destructive">{errorMessage}</p>
        <button
          className="text-sm text-primary underline underline-offset-4"
          onClick={() => navigate("/settings/data", { replace: true })}
        >
          Back to Settings
        </button>
      </div>
    </div>
  );
}
