import { useState, useEffect } from "react";
import { CloudUpload, Link2, Link2Off, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { initiateGoogleAuth, revokeToken } from "@/lib/driveAuth";
import {
  getDriveCredentials,
  clearDriveCredentials,
  type DriveCredentials,
} from "@/db/driveCredentials";
import { toast } from "sonner";

export function GoogleDriveSettings() {
  const [creds, setCreds] = useState<DriveCredentials | null>(null);
  const [isUnlinking, setIsUnlinking] = useState(false);

  useEffect(() => {
    getDriveCredentials().then(setCreds);
  }, []);

  const isConnected = creds !== null;

  async function handleConnect() {
    // Redirects the browser — no further code runs after this
    await initiateGoogleAuth();
  }

  async function handleUnlink() {
    setIsUnlinking(true);
    // Clear local credentials immediately — revocation is best-effort and
    // must not delay the UI or leave credentials in place if it fails.
    const snapshot = creds;
    await clearDriveCredentials();
    setCreds(null);
    try {
      if (snapshot) {
        // Revoking the refresh token automatically invalidates all associated
        // access tokens on Google's side — no need for a second call.
        await revokeToken(snapshot.refreshToken);
      }
    } finally {
      setIsUnlinking(false);
      toast.success("Google Drive disconnected.");
    }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <h2 className="text-sm font-medium flex items-center gap-2">
          <CloudUpload className="h-4 w-4" />
          Google Drive Backup
        </h2>
        <p className="text-xs text-muted-foreground">
          Connect your Google account to back up directly to Drive. Backups are
          saved to the{" "}
          <span className="font-medium text-foreground">ExTrack Backups</span>{" "}
          folder.
        </p>
      </div>

      {isConnected ? (
        <div className="space-y-3">
          {/* Status row */}
          <div className="rounded-lg bg-muted/50 border border-border/50 px-3 py-2.5 space-y-1">
            <div className="flex items-center gap-2">
              <Link2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
              <span className="text-xs font-medium text-green-600 dark:text-green-400">
                Connected
              </span>
            </div>
            <p className="text-xs text-muted-foreground pl-5">
              {creds!.accountEmail}
            </p>
            <p className="text-xs text-muted-foreground pl-5">
              Folder:{" "}
              <span className="font-medium text-foreground">
                ExTrack Backups
              </span>
            </p>
          </div>

          {/* Unlink */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
                disabled={isUnlinking}
              >
                {isUnlinking ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                ) : (
                  <Link2Off className="h-3.5 w-3.5 mr-1.5" />
                )}
                Disconnect Account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Disconnect Google Drive?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will remove your Google account from ExTrack. Existing
                  backups in your Drive will not be deleted — you can reconnect
                  anytime.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={handleUnlink}
                >
                  Disconnect
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ) : (
        <Button variant="outline" size="sm" onClick={handleConnect}>
          <CloudUpload className="h-3.5 w-3.5 mr-1.5" />
          Connect Google Drive
        </Button>
      )}
    </div>
  );
}
