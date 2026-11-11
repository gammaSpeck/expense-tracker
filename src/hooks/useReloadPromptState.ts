import { useRegisterSW } from "virtual:pwa-register/react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { captureError } from "@/lib/telemetry";

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

  // ponytail: a promise that resolves without reloading still leaves the spinner on; add a
  // timeout reset if that ever shows up in telemetry.
  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      await updateServiceWorker(true);
    } catch (err) {
      captureError("sw_update_failed", err);
      toast.error("Update failed. Close and reopen the app to update.");
      setIsUpdating(false);
    }
  };

  return { offlineReady, needRefresh, isUpdating, close, handleUpdate };
}
