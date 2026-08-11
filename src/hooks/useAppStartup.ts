import { useEffect, useState } from "react";
import { toast } from "sonner";
import { initializeDatabase, requestPersistentStorage } from "@/db/expenseTrackerDb";
import { capture } from "@/lib/telemetry";

export function useAppStartup() {
  const [lossCount, setLossCount] = useState<number | null>(null);
  const [lossDialogOpen, setLossDialogOpen] = useState(false);

  useEffect(() => {
    void (async () => {
      const persisted = await requestPersistentStorage();
      const state = await initializeDatabase();
      capture("app_opened", { persisted, startup: state.status });

      if (!persisted) {
        // Hard navigation (not `navigate()`) — this fires before the router's
        // history is guaranteed mounted, and a full reload is fine here since
        // it's a rare, user-initiated escape hatch out of a warning toast.
        toast.warning("This browser may delete your data automatically. Back up regularly.", {
          action: { label: "Back up now", onClick: () => (window.location.href = "/settings/data") },
        });
      }

      if (state.status === "data-loss") {
        setLossCount(state.lastSeenExpenseCount);
        setLossDialogOpen(true);
        capture("data_loss_detected", {
          lastSeenExpenseCount: state.lastSeenExpenseCount,
          installedAt: state.installedAt,
          lastSeenAt: state.lastSeenAt,
        });
      }
    })();
  }, []);

  return { lossCount, setLossCount, lossDialogOpen, setLossDialogOpen };
}
