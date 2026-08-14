import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface FactoryResetConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isResetting: boolean;
  onConfirm: () => void;
}

export function FactoryResetConfirmDialog({
  open,
  onOpenChange,
  isResetting,
  onConfirm,
}: FactoryResetConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Factory Reset</AlertDialogTitle>
          <AlertDialogDescription asChild className="text-left">
            <div className="space-y-3 pt-2">
              <div className="text-sm space-y-2">
                <div className="font-medium text-foreground">This will permanently delete:</div>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 text-xs">
                  <li>All expenses</li>
                  <li>All categories</li>
                  <li>All tags</li>
                  <li>Theme preferences</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                <div className="text-xs text-destructive font-medium">
                  ⚠️ This action CANNOT be undone!
                </div>
              </div>

              <div className="text-xs text-muted-foreground space-y-1.5">
                <div>
                  <span className="font-medium">💡 Backup Reminder:</span> Before proceeding, we
                  recommend backing up your data using the Export feature.
                </div>
                <div>
                  No copy of your data exists on any server or cloud storage. Once deleted, it's
                  gone forever.
                </div>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isResetting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isResetting}
            className="bg-destructive hover:bg-destructive/90"
          >
            {isResetting ? "Resetting..." : "Confirm Reset"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
