import { useState, useRef } from "react";
import { Upload, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { importData, db } from "@/db/expenseTrackerDb";
import { Expense, Category } from "@/types/expense";
import { isEncryptedFile, decryptData, getStoredPassphrase } from "@/lib/backup";
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
  // Encrypted-file state
  const [pendingEncryptedText, setPendingEncryptedText] = useState<string | null>(null);
  const [manualPassphrase, setManualPassphrase] = useState("");
  const [showManualPass, setShowManualPass] = useState(false);
  const [isDecrypting, setIsDecrypting] = useState(false);

  function buildPreview(jsonText: string): boolean {
    try {
      const data = JSON.parse(jsonText);
      if (!data.expenses || !data.categories) throw new Error("Invalid backup file");

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
      return true;
    } catch {
      return false;
    }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Reset any previous encrypted state
    setPendingEncryptedText(null);
    setManualPassphrase("");

    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error("File too large (max 10 MB)");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const text = await selectedFile.text();

    if (!isEncryptedFile(text)) {
      toast.error("Only encrypted .extrack backup files can be imported");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // Try auto-decrypt with stored passphrase
    const stored = await getStoredPassphrase();
    if (stored) {
      try {
        const plaintext = await decryptData(text, stored);
        // Guard: reject CSV exports masquerading as backups
        if (!plaintext.trimStart().startsWith("{")) {
          toast.error("This file is an encrypted export, not a restorable backup");
          if (fileInputRef.current) fileInputRef.current.value = "";
          return;
        }
        if (!buildPreview(plaintext)) {
          toast.error("Invalid backup file");
          if (fileInputRef.current) fileInputRef.current.value = "";
        }
        return;
      } catch {
        // Wrong passphrase or corrupted — fall through to manual entry
      }
    }

    // No stored passphrase (or auto-decrypt failed) — keep file, ask for passphrase manually
    setPendingEncryptedText(text);
  }

  async function handleManualDecrypt() {
    if (!pendingEncryptedText || !manualPassphrase) return;
    setIsDecrypting(true);
    try {
      const plaintext = await decryptData(pendingEncryptedText, manualPassphrase);
      if (!plaintext.trimStart().startsWith("{")) {
        toast.error("This file is an encrypted export, not a restorable backup");
        setPendingEncryptedText(null);
        setManualPassphrase("");
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      if (buildPreview(plaintext)) {
        setPendingEncryptedText(null);
        setManualPassphrase("");
      } else {
        toast.error("Invalid backup file");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      // "Wrong passphrase" — keep file loaded so user can retry
      toast.error(
        msg.includes("Wrong passphrase")
          ? "Wrong passphrase — try again"
          : "Decryption failed. The file may be corrupted.",
      );
    } finally {
      setIsDecrypting(false);
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
      setPendingEncryptedText(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch {
      toast.error("Import failed");
    } finally {
      setIsImporting(false);
    }
  }

  function handleCancel() {
    setPreview(null);
    setPendingEncryptedText(null);
    setManualPassphrase("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  // State: awaiting manual passphrase entry
  if (pendingEncryptedText) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
          Encrypted file detected. Enter the passphrase used when this backup was created.
        </div>
        <div className="space-y-2">
          <Label htmlFor="import-pass" className="text-sm">
            Passphrase
          </Label>
          <div className="relative">
            <Input
              id="import-pass"
              type={showManualPass ? "text" : "password"}
              value={manualPassphrase}
              onChange={(e) => setManualPassphrase(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleManualDecrypt();
              }}
              placeholder="Enter backup passphrase"
              className="pr-10 focus-visible:ring-0 focus-visible:ring-offset-0"
              autoComplete="current-password"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowManualPass((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showManualPass ? "Hide" : "Show"}
            >
              {showManualPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleCancel} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={handleManualDecrypt}
            disabled={!manualPassphrase || isDecrypting}
            className="flex-1"
          >
            {isDecrypting ? "Decrypting..." : "Decrypt"}
          </Button>
        </div>
      </div>
    );
  }

  if (!preview) {
    return (
      <div className="space-y-2">
        <label className="flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
          <input
            ref={fileInputRef}
            type="file"
            accept=".extrack"
            className="hidden"
            onChange={handleFileSelect}
          />
          <Upload className="h-4 w-4" />
          <span className="text-sm">Select .extrack backup file</span>
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
        <RadioGroup value={mode} onValueChange={(v) => setMode(v as "merge" | "override")}>
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
        <Button variant="outline" onClick={handleCancel} className="flex-1">
          Cancel
        </Button>
        <Button onClick={handleImport} disabled={isImporting} className="flex-1">
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
  await db.transaction("rw", [db.expenses, db.categories, db.tagMetadata], async () => {
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
  });
}
