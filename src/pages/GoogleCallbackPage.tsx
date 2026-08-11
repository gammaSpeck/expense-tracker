import { useNavigate } from "react-router";
import { useGoogleOAuthCallback } from "@/hooks/useGoogleOAuthCallback";

export default function GoogleCallbackPage() {
  const navigate = useNavigate();
  const { status, errorMessage } = useGoogleOAuthCallback(navigate);

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
