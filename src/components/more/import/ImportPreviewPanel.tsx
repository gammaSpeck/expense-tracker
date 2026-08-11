import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { ImportPreview } from "@/lib/importPreview";

interface ImportPreviewPanelProps {
  preview: ImportPreview;
  mode: "merge" | "override";
  onModeChange: (mode: "merge" | "override") => void;
  isImporting: boolean;
  onCancel: () => void;
  onImport: () => void;
}

export function ImportPreviewPanel({
  preview,
  mode,
  onModeChange,
  isImporting,
  onCancel,
  onImport,
}: ImportPreviewPanelProps) {
  return (
    <div className="space-y-4">
      <h3 className="font-medium">Import Preview</h3>

      <div className="p-3 rounded-lg bg-muted/50 space-y-1 text-sm">
        <p>📊 {preview.expenseCount} expenses</p>
        <p>📁 {preview.categoryCount} categories</p>
        <p>
          📅 {preview.dateRange.earliest} to {preview.dateRange.latest}
        </p>
      </div>

      <div className="space-y-3">
        <Label className="text-sm text-muted-foreground">Import Mode</Label>
        <RadioGroup value={mode} onValueChange={(v) => onModeChange(v as "merge" | "override")}>
          <div className="flex items-start gap-3 p-3 rounded-lg border border-border">
            <RadioGroupItem value="merge" id="merge" className="mt-1" />
            <div>
              <Label htmlFor="merge" className="cursor-pointer font-medium">
                Merge (Safe)
              </Label>
              <p className="text-xs text-muted-foreground">
                Combine with existing data, skip duplicates
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-lg border border-destructive/30">
            <RadioGroupItem value="override" id="override" className="mt-1" />
            <div>
              <Label htmlFor="override" className="cursor-pointer font-medium text-destructive">
                Override (Destructive)
              </Label>
              <p className="text-xs text-muted-foreground">Delete all existing data and replace</p>
            </div>
          </div>
        </RadioGroup>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button onClick={onImport} disabled={isImporting} className="flex-1">
          {isImporting ? "Importing..." : "Confirm Import"}
        </Button>
      </div>
    </div>
  );
}
