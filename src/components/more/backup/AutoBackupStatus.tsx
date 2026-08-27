import { useEffect, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
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
import { getBackupReminderPreferences, getStoredPassphrase } from "@/lib/backup";
import { AUTO_BACKUP_UPDATED_EVENT, restoreSnapshot, runAutoBackup } from "@/lib/autoBackup";
import { opfsAvailable, readManifest, type SnapshotManifest } from "@/lib/snapshotStore";
import { getDriveCredentials } from "@/db/driveCredentials";

/** Quiet status row for `BackupCard`: last automatic snapshot/Drive time, an anomaly escape
 *  hatch, and the "restore from a safety copy" list. Renders nothing when OPFS is unavailable —
 *  Tier 1 is inert there, and this row exists only to report on it. */
export function AutoBackupStatus() {
  const [manifest, setManifest] = useState<SnapshotManifest | null>(null);
  const [prefs, setPrefs] = useState(() => getBackupReminderPreferences());
  const [driveActionable, setDriveActionable] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  async function refresh() {
    const [nextManifest, creds, passphrase] = await Promise.all([
      readManifest(),
      getDriveCredentials(),
      getStoredPassphrase(),
    ]);
    setManifest(nextManifest);
    setPrefs(getBackupReminderPreferences());
    setDriveActionable(creds !== null && !passphrase);
  }

  useEffect(() => {
    void refresh();
    const handleUpdate = () => void refresh();
    window.addEventListener(AUTO_BACKUP_UPDATED_EVENT, handleUpdate);
    return () => window.removeEventListener(AUTO_BACKUP_UPDATED_EVENT, handleUpdate);
  }, []);

  if (!opfsAvailable()) return null;

  const latest = manifest?.history[0] ?? null;

  async function handleSnapshotNow() {
    setIsRunning(true);
    try {
      await runAutoBackup({ force: true });
      await refresh();
    } finally {
      setIsRunning(false);
    }
  }

  async function handleRestore(name: string) {
    try {
      const { expenseCount } = await restoreSnapshot(name);
      toast.success(
        `Restored ${expenseCount} expenses. Currency and theme settings are not part of a safety copy.`,
      );
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Restore failed");
    }
  }

  return (
    <div className="space-y-1 py-2 text-xs text-muted-foreground">
      {latest && (
        <div>
          Safety copy: {format(new Date(latest.writtenAt), "MMM d, h:mm a")} · {latest.expenseCount}{" "}
          expense{latest.expenseCount === 1 ? "" : "s"}
        </div>
      )}
      {prefs.lastAutoDriveAt && <div>Drive: {format(new Date(prefs.lastAutoDriveAt), "MMM d")}</div>}
      {prefs.autoBackupAnomaly && (
        <div className="flex items-center justify-between gap-2 text-amber-600">
          <span>{prefs.autoBackupAnomaly}</span>
          <Button
            size="sm"
            variant="outline"
            className="h-6 shrink-0 px-2 text-xs"
            onClick={handleSnapshotNow}
            disabled={isRunning}
          >
            Snapshot now
          </Button>
        </div>
      )}
      {driveActionable && <div>Drive is linked but no passphrase is set</div>}
      {manifest && manifest.history.length > 0 && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 px-0 text-xs underline">
              Restore from safety copy
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Restore from safety copy</AlertDialogTitle>
              <AlertDialogDescription asChild className="text-left">
                <div className="space-y-2 pt-2 text-sm">
                  {manifest.history.map((entry) => (
                    <div key={entry.name} className="flex items-center justify-between gap-2">
                      <span>
                        {format(new Date(entry.writtenAt), "MMM d, h:mm a")} · {entry.expenseCount}{" "}
                        expenses
                        {entry.partial ? " (partial)" : ""}
                      </span>
                      <AlertDialogAction onClick={() => handleRestore(entry.name)}>
                        Restore
                      </AlertDialogAction>
                    </div>
                  ))}
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Close</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
