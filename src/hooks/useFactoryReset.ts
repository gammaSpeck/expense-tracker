import { useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { db, initializeDatabase } from "@/db/expenseTrackerDb";
import { clearBulkDraft } from "@/db/bulkDraft";
import { userPreferences } from "@/db/userPreferences";
import { clearPassphrase } from "@/lib/backup";
import { captureError } from "@/lib/telemetry";
import { markWhatsNewSeen } from "@/hooks/useWhatsNew";

export function useFactoryReset() {
  const [open, setOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const navigate = useNavigate();

  async function handleFactoryReset() {
    setIsResetting(true);
    try {
      // Clear all data
      await Promise.all([
        db.expenses.clear(),
        db.categories.clear(),
        db.tagMetadata.clear(),
        clearBulkDraft(),
      ]);

      userPreferences.clearAll();
      // Re-stamps lastSeenVersion at the current release, same as a real fresh install would —
      // otherwise initializeDatabase() below writes a new install marker with no matching
      // what's-new state, and the very next reload misreads that as an existing install
      // adopting the feature for the first time and auto-opens the dialog.
      markWhatsNewSeen();
      await clearPassphrase();

      // Re-seed default categories
      await initializeDatabase();

      toast.success("All data cleared. App reset to default state.");
      setOpen(false);
      navigate("/");
    } catch (err) {
      captureError("factory_reset_failed", err);
      toast.error("Factory reset failed");
    } finally {
      setIsResetting(false);
    }
  }

  return { open, setOpen, isResetting, handleFactoryReset };
}
