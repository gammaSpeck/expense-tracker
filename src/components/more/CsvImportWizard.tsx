import { useState, useEffect } from "react";
import { FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCategories } from "@/hooks/useExpenseData";
import { useCsvImport } from "./csv-import/useCsvImport";
import Step0BackupNudge from "./csv-import/Step0BackupNudge";
import Step1Upload from "./csv-import/Step1Upload";
import Step2ColumnMapping from "./csv-import/Step2ColumnMapping";
import Step3CategoryRules from "./csv-import/Step3CategoryRules";
import Step4Preview from "./csv-import/Step4Preview";

function getDialogTitle(step: number): string {
  switch (step) {
    case 0: return "Import from CSV";
    case 1: return "Import from CSV — Upload";
    case 2: return "Import from CSV — Column Mapping (Step 1 of 3)";
    case 3: return "Import from CSV — Category Rules (Step 2 of 3)";
    case 4: return "Import from CSV — Preview & Import (Step 3 of 3)";
    default: return "Import from CSV";
  }
}

export function CsvImportWizard() {
  const [open, setOpen] = useState(false);
  const categories = useCategories();
  const wizard = useCsvImport(categories);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      wizard.resetAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handleClose() {
    setOpen(false);
  }

  return (
    <>
      <Button
        variant="outline"
        className="w-full gap-2"
        onClick={() => setOpen(true)}
      >
        <FileSpreadsheet className="h-4 w-4" />
        Import from CSV
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">{getDialogTitle(wizard.step)}</DialogTitle>
          </DialogHeader>

          {wizard.step === 0 && (
            <Step0BackupNudge onSkip={() => wizard.setStep(1)} />
          )}

          {wizard.step === 1 && (
            <Step1Upload
              onParsed={wizard.setParsedData}
              onNext={() => wizard.setStep(2)}
              hasParsedData={wizard.csvHeaders.length > 0}
              csvHeaders={wizard.csvHeaders}
              csvRows={wizard.csvRows}
            />
          )}

          {wizard.step === 2 && (
            <Step2ColumnMapping
              csvHeaders={wizard.csvHeaders}
              csvRows={wizard.csvRows}
              columnMapping={wizard.columnMapping}
              updateColumnMapping={wizard.updateColumnMapping}
              onBack={() => wizard.setStep(1)}
              onNext={() => wizard.setStep(3)}
            />
          )}

          {wizard.step === 3 && (
            <Step3CategoryRules
              uniqueCategoryValues={wizard.uniqueCategoryValues}
              categoryRules={wizard.categoryRules}
              setCategoryRules={wizard.setCategoryRules}
              defaultCategoryId={wizard.defaultCategoryId}
              setDefaultCategoryId={wizard.setDefaultCategoryId}
              categories={categories}
              othersCategory={wizard.othersCategory}
              ignoreRules={wizard.ignoreRules}
              addIgnoreRule={wizard.addIgnoreRule}
              updateIgnoreRule={wizard.updateIgnoreRule}
              removeIgnoreRule={wizard.removeIgnoreRule}
              csvHeaders={wizard.csvHeaders}
              mappedDateCol={wizard.columnMapping.date}
              mappedAmountCol={wizard.columnMapping.amount}
              onBack={() => wizard.setStep(2)}
              onNext={() => {
                wizard.runTransformation();
                wizard.setStep(4);
              }}
            />
          )}

          {wizard.step === 4 && (
            <Step4Preview
              totalRows={wizard.csvRows.length}
              validRows={wizard.validRows}
              skippedByRules={wizard.skippedByRules}
              dataErrors={wizard.dataErrors}
              categories={categories}
              onBack={() => wizard.setStep(3)}
              onDone={handleClose}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
