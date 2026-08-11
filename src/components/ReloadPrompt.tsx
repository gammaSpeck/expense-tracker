import { RefreshCw, X } from "lucide-react";
import { useReloadPromptState } from "@/hooks/useReloadPromptState";
import { ReloadPromptActions } from "@/components/ReloadPromptActions";

/**
 * ReloadPrompt - PWA Update Notification Component
 *
 * Displays a sleek bottom banner when:
 * - A new version of the app is available (needRefresh)
 * - The app is ready to work offline (offlineReady)
 *
 * Features:
 * - Matches app's teal-accent dark theme
 * - Auto-dismisses offline-ready notification after 10s
 * - Shows loading state during update
 * - Positioned above bottom navigation
 */
export function ReloadPrompt() {
  const { offlineReady, needRefresh, isUpdating, close, handleUpdate } = useReloadPromptState();

  if (!(needRefresh || offlineReady)) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-60 animate-slide-in-up transition-all duration-300">
      <div className="mx-auto max-w-md">
        <div className="glass-card p-4 border-primary/30 shadow-2xl">
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className="shrink-0 mt-0.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
                <RefreshCw className={`h-5 w-5 text-primary ${isUpdating ? "animate-spin" : ""}`} />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-foreground mb-1">
                {needRefresh ? "New version available!" : "App ready to work offline"}
              </h3>
              <p className="text-xs text-muted-foreground mb-3">
                {needRefresh
                  ? "Click update to reload and get the latest features."
                  : "The app is cached and ready to work offline."}
              </p>

              <ReloadPromptActions
                needRefresh={needRefresh}
                isUpdating={isUpdating}
                onUpdate={handleUpdate}
                onClose={close}
              />
            </div>

            {/* Close button */}
            <button
              onClick={close}
              disabled={isUpdating}
              className="shrink-0 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Teal accent glow bar */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-linear-to-r from-primary/0 via-primary to-primary/0 rounded-b-xl" />
        </div>
      </div>
    </div>
  );
}
