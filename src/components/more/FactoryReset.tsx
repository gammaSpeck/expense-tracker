import { useState } from "react";
import { Trash2 } from "lucide-react";
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
} from "@/components/ui/alert-dialog";
import { db, initializeDatabase } from "@/db/expenseTrackerDb";
import { userPreferences } from "@/db/userPreferences";
import { clearPassphrase } from "@/lib/backup";
import { toast } from "sonner";
import { useNavigate } from "react-router";

export function FactoryReset() {
  const [open, setOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const navigate = useNavigate();

  async function handleFactoryReset() {
    setIsResetting(true);
    try {
      // Clear all data
      await Promise.all([db.expenses.clear(), db.categories.clear(), db.tagMetadata.clear()]);

      userPreferences.clearAll();
      await clearPassphrase();

      // Re-seed default categories
      await initializeDatabase();

      toast.success("All data cleared. App reset to default state.");
      setOpen(false);
      navigate("/");
    } catch {
      toast.error("Factory reset failed");
    } finally {
      setIsResetting(false);
    }
  }

  return (
    <>
      <div className="space-y-2">
        <p className="text-sm font-medium">Clear All Data</p>
        <p className="text-xs text-muted-foreground">
          Permanently delete all expenses, categories, and settings
        </p>
        <Button variant="destructive" onClick={() => setOpen(true)} className="w-full">
          <Trash2 className="h-4 w-4 mr-2" />
          Factory Reset
        </Button>
      </div>

      <AlertDialog open={open} onOpenChange={setOpen}>
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
              onClick={handleFactoryReset}
              disabled={isResetting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isResetting ? "Resetting..." : "Confirm Reset"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
