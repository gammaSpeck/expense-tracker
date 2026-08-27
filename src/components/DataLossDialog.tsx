import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface SnapshotOffer {
  writtenAt: string;
  expenseCount: number;
}

interface DataLossDialogProps {
  open: boolean;
  lastSeenExpenseCount: number | null;
  snapshot?: SnapshotOffer | null;
  onStartFresh: () => void;
  onRestore: () => void;
  onRestoreSnapshot?: () => void;
}

export function DataLossDialog({
  open,
  lastSeenExpenseCount,
  snapshot = null,
  onStartFresh,
  onRestore,
  onRestoreSnapshot,
}: DataLossDialogProps) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Data missing</AlertDialogTitle>
          <AlertDialogDescription asChild className="text-left">
            <div className="space-y-3 pt-2">
              <div className="text-sm text-foreground">
                {lastSeenExpenseCount !== null ? (
                  <>
                    This device previously held{" "}
                    <span className="font-medium">{lastSeenExpenseCount}</span> expense
                    {lastSeenExpenseCount === 1 ? "" : "s"}, but the browser&apos;s storage for this
                    app is now empty.
                  </>
                ) : (
                  "Your expense list is empty."
                )}
              </div>
              {snapshot ? (
                <div className="text-xs text-muted-foreground">
                  We found a local safety copy from{" "}
                  {format(new Date(snapshot.writtenAt), "MMM d, h:mm a")} with{" "}
                  <span className="font-medium">{snapshot.expenseCount}</span> expenses. Restore it?
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">
                  This usually means the browser cleared its storage. If you have a backup file or a
                  Google Drive backup, restore it now — starting fresh discards the chance to recover
                  this device's copy.
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction
            onClick={onStartFresh}
            className="bg-secondary text-secondary-foreground hover:bg-secondary/80"
          >
            Start fresh
          </AlertDialogAction>
          {snapshot ? (
            <AlertDialogAction onClick={onRestoreSnapshot}>
              Restore {snapshot.expenseCount} expenses
            </AlertDialogAction>
          ) : (
            <AlertDialogAction onClick={onRestore}>Restore from backup</AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
