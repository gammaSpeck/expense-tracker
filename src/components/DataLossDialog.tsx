import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useNavigate } from "react-router";

interface DataLossDialogProps {
  lastSeenExpenseCount: number;
  onStartFresh: () => void;
}

export function DataLossDialog({ lastSeenExpenseCount, onStartFresh }: DataLossDialogProps) {
  const navigate = useNavigate();

  return (
    <AlertDialog open>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Data missing</AlertDialogTitle>
          <AlertDialogDescription asChild className="text-left">
            <div className="space-y-3 pt-2">
              <div className="text-sm text-foreground">
                This device previously held <span className="font-medium">{lastSeenExpenseCount}</span>{" "}
                expense{lastSeenExpenseCount === 1 ? "" : "s"}, but the browser&apos;s storage for
                this app is now empty.
              </div>
              <div className="text-xs text-muted-foreground">
                This usually means the browser cleared its storage. If you have a backup file or a
                Google Drive backup, restore it now — starting fresh discards the chance to recover
                this device's copy.
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={onStartFresh} className="bg-secondary text-secondary-foreground hover:bg-secondary/80">
            Start fresh
          </AlertDialogAction>
          <AlertDialogAction onClick={() => navigate("/settings/data")}>
            Restore from backup
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
