import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReloadPromptActionsProps {
  needRefresh: boolean;
  isUpdating: boolean;
  onUpdate: () => void;
  onClose: () => void;
}

export function ReloadPromptActions({ needRefresh, isUpdating, onUpdate, onClose }: ReloadPromptActionsProps) {
  return (
    <div className="flex gap-2">
      {needRefresh && (
        <Button onClick={onUpdate} disabled={isUpdating} size="xs">
          {isUpdating ? (
            <>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              Updating...
            </>
          ) : (
            <>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Update Now
            </>
          )}
        </Button>
      )}
      <Button onClick={onClose} variant="ghost" size="xs" disabled={isUpdating}>
        {needRefresh ? "Later" : "Dismiss"}
      </Button>
    </div>
  );
}
