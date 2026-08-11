import { useRegisterSW } from "virtual:pwa-register/react";
import { useCallback, useEffect, useState } from "react";

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

  const handleUpdate = async () => {
    setIsUpdating(true);
    await updateServiceWorker(true);
  };

  return { offlineReady, needRefresh, isUpdating, close, handleUpdate };
}
