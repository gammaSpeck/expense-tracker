import { useRegisterSW } from "virtual:pwa-register/react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { capture } from "@/lib/telemetry";

// A successful update reloads the page within a second or two (skip-waiting → controllerchange).
const UPDATE_STALL_MS = 10_000;

export function useReloadPromptState() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log("SW Registered: " + r);
    },
    onRegisterError(error) {
      console.log("SW registration error", error);
    },
  });

  const [isUpdating, setIsUpdating] = useState(false);

  const close = useCallback(() => {
    setOfflineReady(false);
    setNeedRefresh(false);
  }, [setOfflineReady, setNeedRefresh]);

  useEffect(() => {
    if (!(needRefresh || offlineReady)) return;

    // Auto-dismiss after 10 seconds if no interaction (only for offline ready)
    const timer = setTimeout(() => {
      if (offlineReady && !needRefresh) {
        close();
      }
    }, 10000);

    return () => clearTimeout(timer);
  }, [offlineReady, needRefresh, close]);

  // updateServiceWorker never rejects (vite-plugin-pwa fires the skip-waiting message and drops
  // its promise), so success is only visible as a page reload. Still here after UPDATE_STALL_MS →
  // the update stalled (message lost, waiting worker gone): unlock the prompt so the user can retry.
  const handleUpdate = async () => {
    setIsUpdating(true);
    await updateServiceWorker(true);
    setTimeout(() => {
      capture("sw_update_stalled");
      toast.error("Update failed. Close and reopen the app to update.");
      setIsUpdating(false);
    }, UPDATE_STALL_MS);
  };

  return { offlineReady, needRefresh, isUpdating, close, handleUpdate };
}
