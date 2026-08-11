import { useState } from "react";
import { importData, touchInstallMarker, db } from "@/db/expenseTrackerDb";
import { Expense, Category } from "@/types/expense";
import { captureError } from "@/lib/telemetry";
import { toast } from "sonner";
import { useEncryptedFileImport } from "@/hooks/useEncryptedFileImport";
import type { ImportPreview } from "@/lib/importPreview";
import { ImportFlow } from "@/components/more/import/ImportFlow";

async function performImport(
  preview: ImportPreview,
  mode: "merge" | "override",
  setIsImporting: (value: boolean) => void,
  onDone: () => void,
) {
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
    onDone();
  } catch (err) {
    captureError("import_failed", err, { mode, stage: "write" });
    toast.error("Import failed");
  } finally {
    setIsImporting(false);
  }
}

export function ImportData() {
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [mode, setMode] = useState<"merge" | "override">("override");
  const [isImporting, setIsImporting] = useState(false);

  const {
    fileInputRef,
    pendingEncryptedText,
    manualPassphrase,
    setManualPassphrase,
    showManualPass,
    toggleShowManualPass,
    isDecrypting,
    handleFileSelect,
    handleManualDecrypt,
    resetEncryptedState,
  } = useEncryptedFileImport(setPreview);

  function handleCancel() {
    setPreview(null);
    resetEncryptedState();
  }

  function handleImport() {
    if (!preview) return;
    performImport(preview, mode, setIsImporting, () => {
      setPreview(null);
      resetEncryptedState();
    });
  }

  return (
    <ImportFlow
      pendingEncryptedText={pendingEncryptedText}
      manualPassphrase={manualPassphrase}
      setManualPassphrase={setManualPassphrase}
      showManualPass={showManualPass}
      toggleShowManualPass={toggleShowManualPass}
      isDecrypting={isDecrypting}
      onCancel={handleCancel}
      onManualDecrypt={handleManualDecrypt}
      fileInputRef={fileInputRef}
      onFileSelect={handleFileSelect}
      preview={preview}
      mode={mode}
      onModeChange={setMode}
      isImporting={isImporting}
      onImport={handleImport}
    />
  );
}

// Merge import function (doesn't clear existing data)
async function mergeImportData(data: {
  expenses: Expense[];
  categories: Category[];
}): Promise<void> {
  await db.transaction("rw", [db.expenses, db.categories, db.tagMetadata], async () => {
    // Import categories (skip by id; category names are unique per profile — default
    // categories get a fresh random id every boot, so a name match on an existing row
    // must remap the import to that row's id rather than re-inserting under the old id,
    // or the `&name` unique index throws and aborts the whole merge).
    const categoryIdMap = new Map<string, string>();
    for (const category of data.categories) {
      const existingById = await db.categories.get(category.id);
      if (existingById) {
        categoryIdMap.set(category.id, category.id);
        continue;
      }
      const existingByName = await db.categories.where("name").equals(category.name).first();
      if (existingByName) {
        categoryIdMap.set(category.id, existingByName.id);
        continue;
      }
      await db.categories.add(category);
      categoryIdMap.set(category.id, category.id);
    }

    // Import expenses (skip if already exists by id)
    for (const expense of data.expenses) {
      const exists = await db.expenses.get(expense.id);
      if (!exists) {
        const category = categoryIdMap.get(expense.category) ?? expense.category;
        await db.expenses.add({ ...expense, category });

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

  touchInstallMarker(await db.expenses.count());
}
