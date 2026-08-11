import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFactoryReset } from "@/hooks/useFactoryReset";
import { FactoryResetConfirmDialog } from "@/components/more/FactoryResetConfirmDialog";

export function FactoryReset() {
  const { open, setOpen, isResetting, handleFactoryReset } = useFactoryReset();

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

      <FactoryResetConfirmDialog
        open={open}
        onOpenChange={setOpen}
        isResetting={isResetting}
        onConfirm={handleFactoryReset}
      />
    </>
  );
}
