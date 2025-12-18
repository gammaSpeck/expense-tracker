import { useState } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { db, initializeDatabase } from "@/lib/db";
import { toast } from "sonner";
import { useNavigate } from "react-router";

export function FactoryReset() {
  const [stage, setStage] = useState<"initial" | "warning" | "confirm">(
    "initial"
  );
  const [confirmText, setConfirmText] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const navigate = useNavigate();

  async function handleFactoryReset() {
    if (confirmText !== "DELETE ALL DATA") {
      toast.error("Please type the confirmation text correctly");
      return;
    }

    setIsResetting(true);
    try {
      // Clear all data
      await db.expenses.clear();
      await db.categories.clear();
      await db.tagMetadata.clear();

      // Clear localStorage
      localStorage.clear();

      // Re-seed default categories
      await initializeDatabase();

      toast.success("All data cleared. App reset to default state.");
      setStage("initial");
      setConfirmText("");
      navigate("/");
    } catch (error) {
      toast.error("Factory reset failed");
    } finally {
      setIsResetting(false);
    }
  }

  if (stage === "confirm") {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-4 w-4" />
          <span className="text-sm font-medium">Final Confirmation</span>
        </div>

        <p className="text-xs text-muted-foreground">
          Type <span className="font-mono font-bold">DELETE ALL DATA</span> to
          confirm:
        </p>

        <Input
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder="DELETE ALL DATA"
          className="font-mono"
        />

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setStage("initial");
              setConfirmText("");
            }}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleFactoryReset}
            disabled={isResetting || confirmText !== "DELETE ALL DATA"}
            className="flex-1"
          >
            {isResetting ? "Resetting..." : "Confirm Factory Reset"}
          </Button>
        </div>
      </div>
    );
  }

  if (stage === "warning") {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-4 w-4" />
          <span className="text-sm font-medium">Factory Reset Warning</span>
        </div>

        <div className="text-xs space-y-2">
          <p className="font-medium">This will permanently delete:</p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li>All expenses</li>
            <li>All categories</li>
            <li>All tags</li>
            <li>Theme preferences</li>
          </ul>
        </div>

        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
          <p className="text-sm text-destructive font-medium">
            🔴 This action CANNOT be undone!
          </p>
        </div>

        <div className="text-sm text-muted-foreground space-y-1">
          <p>
            <span className="font-medium">💡 Backup Reminder:</span> Before
            proceeding, we recommend backing up your data using the Export
            feature above.
          </p>
          <p>
            No copy of your data exists on any server or cloud storage. Once
            deleted, it's gone forever.
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setStage("initial")}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => setStage("confirm")}
            className="flex-1"
          >
            I Understand, Proceed →
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Clear All Data</p>
      <p className="text-xs text-muted-foreground">
        Permanently delete all expenses, categories, and settings
      </p>
      <Button
        variant="destructive"
        onClick={() => setStage("warning")}
        className="w-full"
      >
        <Trash2 className="h-4 w-4 mr-2" />
        Factory Reset
      </Button>
    </div>
  );
}
