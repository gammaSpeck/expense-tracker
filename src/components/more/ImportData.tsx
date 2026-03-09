import { useState, useRef } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { importData, db } from "@/db/expenseTrackerDb";
import { Expense, Category } from "@/types/expense";
import { toast } from "sonner";

interface ImportPreview {
  expenseCount: number;
  categoryCount: number;
  dateRange: {
    earliest: string;
    latest: string;
  };
  data: { expenses: Expense[]; categories: Category[] };
}

export function ImportData() {
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [mode, setMode] = useState<"merge" | "override">("override");
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    try {
      const text = await selectedFile.text();
      const data = JSON.parse(text);

      // Validate structure
      if (!data.expenses || !data.categories) {
        throw new Error("Invalid backup file");
      }

      // Sort expenses by date to get range
      const sortedExpenses = [...data.expenses].sort((a: Expense, b: Expense) =>
        a.date.localeCompare(b.date),
      );

      setPreview({
        expenseCount: data.expenses.length,
        categoryCount: data.categories.length,
        dateRange: {
          earliest: sortedExpenses[0]?.date || "N/A",
          latest: sortedExpenses[sortedExpenses.length - 1]?.date || "N/A",
        },
        data,
      });
    } catch (error) {
      toast.error("Invalid backup file");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function handleImport() {
    if (!preview) return;

    setIsImporting(true);
    try {
      if (mode === "override") {
        // Use existing importData function (it clears by default)
        await importData(preview.data);
      } else {
        // Merge mode: add without clearing
        await mergeImportData(preview.data);
      }

      toast.success("Data imported successfully");
      setPreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      toast.error("Import failed");
    } finally {
      setIsImporting(false);
    }
  }

  function handleCancel() {
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  if (!preview) {
    return (
      <div className="space-y-2">
        <label className="flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleFileSelect}
          />
          <Upload className="h-4 w-4" />
          <span className="text-sm">Select JSON backup file</span>
        </label>
      </div>
    );
  }

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
        <RadioGroup
          value={mode}
          onValueChange={(v) => setMode(v as "merge" | "override")}
        >
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
              <Label
                htmlFor="override"
                className="cursor-pointer font-medium text-destructive"
              >
                Override (Destructive)
              </Label>
              <p className="text-xs text-muted-foreground">
                Delete all existing data and replace
              </p>
            </div>
          </div>
        </RadioGroup>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={handleCancel} className="flex-1">
          Cancel
        </Button>
        <Button
          onClick={handleImport}
          disabled={isImporting}
          className="flex-1"
        >
          {isImporting ? "Importing..." : "Confirm Import"}
        </Button>
      </div>
    </div>
  );
}

// Merge import function (doesn't clear existing data)
async function mergeImportData(data: {
  expenses: Expense[];
  categories: Category[];
}): Promise<void> {
  await db.transaction(
    "rw",
    [db.expenses, db.categories, db.tagMetadata],
    async () => {
      // Import categories (skip if already exists by id)
      for (const category of data.categories) {
        const exists = await db.categories.get(category.id);
        if (!exists) {
          await db.categories.add(category);
        }
      }

      // Import expenses (skip if already exists by id)
      for (const expense of data.expenses) {
        const exists = await db.expenses.get(expense.id);
        if (!exists) {
          await db.expenses.add(expense);

          // Update tag metadata
          for (const tag of expense.tags) {
            const tagMeta = await db.tagMetadata.get(tag);
            if (tagMeta) {
              await db.tagMetadata.update(tag, {
                count: tagMeta.count + 1,
                lastUsed: new Date().toISOString(),
              });
            } else {
              await db.tagMetadata.add({
                tag,
                count: 1,
                lastUsed: new Date().toISOString(),
              });
            }
          }
        }
      }
    },
  );
}
