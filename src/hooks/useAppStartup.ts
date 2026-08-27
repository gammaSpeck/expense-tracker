import { useEffect, useState } from "react";
import { toast } from "sonner";
import { db, initializeDatabase, requestPersistentStorage } from "@/db/expenseTrackerDb";
import { capture } from "@/lib/telemetry";
import { getBackupReminderPreferences } from "@/lib/backup";
import { runAutoBackup } from "@/lib/autoBackup";
import { readManifest } from "@/lib/snapshotStore";

export interface RestoreOffer {
  name: string;
  writtenAt: string;
  expenseCount: number;
}

export function useAppStartup() {
  const [lossCount, setLossCount] = useState<number | null>(null);
  const [lossDialogOpen, setLossDialogOpen] = useState(false);
  const [restoreOffer, setRestoreOffer] = useState<RestoreOffer | null>(null);

  useEffect(() => {
    void (async () => {
      const persisted = await requestPersistentStorage();
      const state = await initializeDatabase();
      capture("app_opened", { persisted, startup: state.status });
      void runAutoBackup();

      if (!persisted) {
        // Hard navigation (not `navigate()`) — this fires before the router's
        // history is guaranteed mounted, and a full reload is fine here since
        // it's a rare, user-initiated escape hatch out of a warning toast.
        toast.warning("This browser may delete your data automatically. Back up regularly.", {
          action: { label: "Back up now", onClick: () => (window.location.href = "/settings/data") },
        });
      }

      const isWipe = state.status === "data-loss";
      if (isWipe && state.status === "data-loss") {
        setLossCount(state.lastSeenExpenseCount);
        setLossDialogOpen(true);
        capture("data_loss_detected", {
          lastSeenExpenseCount: state.lastSeenExpenseCount,
          installedAt: state.installedAt,
          lastSeenAt: state.lastSeenAt,
        });
      }

      // Covers both the 'data-loss' branch above and a plain empty list (e.g. a FactoryReset
      // mis-tap, which resets the install marker and so never reaches 'data-loss') — either way,
      // an empty DB with a safety copy on disk is worth surfacing without a settings hunt.
      const expenseCount = await db.expenses.count();
      if (expenseCount === 0) {
        const manifest = await readManifest();
        const latest = manifest?.history[0];
        const prefs = getBackupReminderPreferences();
        if (latest && latest.expenseCount > 0 && prefs.restoreOfferDeclinedFor !== latest.name) {
          setRestoreOffer({ name: latest.name, writtenAt: latest.writtenAt, expenseCount: latest.expenseCount });
          if (!isWipe) setLossDialogOpen(true);
        }
      }
    })();
  }, []);

  return { lossCount, setLossCount, lossDialogOpen, setLossDialogOpen, restoreOffer, setRestoreOffer };
}
