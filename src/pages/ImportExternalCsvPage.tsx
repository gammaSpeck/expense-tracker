import { useEffect } from "react";
import { useNavigate } from "react-router";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCategories } from "@/hooks/useExpenseData";
import { useCsvImport } from "@/components/more/csv-import/useCsvImport";
import Step0BackupNudge from "@/components/more/csv-import/Step0BackupNudge";
import Step1Upload from "@/components/more/csv-import/Step1Upload";
import Step2ColumnMapping from "@/components/more/csv-import/Step2ColumnMapping";
import Step3CategoryRules from "@/components/more/csv-import/Step3CategoryRules";
import Step4Preview from "@/components/more/csv-import/Step4Preview";

function getPageTitle(step: number): string {
  switch (step) {
    case 0:
      return "Import from CSV";
    case 1:
      return "Import from CSV — Upload";
    case 2:
      return "Import from CSV — Column Mapping (Step 1 of 3)";
    case 3:
      return "Import from CSV — Category Rules (Step 2 of 3)";
    case 4:
      return "Import from CSV — Preview & Import (Step 3 of 3)";
    default:
      return "Import from CSV";
  }
}

export default function ImportExternalCsvPage() {
  const navigate = useNavigate();
  const categories = useCategories();
  const wizard = useCsvImport(categories);

  useEffect(() => {
    wizard.resetAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleBack() {
    if (wizard.step === 0) {
      wizard.resetAll();
      navigate("/settings/data");
    } else {
      wizard.setStep(wizard.step - 1);
    }
  }

  function handleDone() {
    wizard.resetAll();
    navigate("/settings/data");
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border/50 px-4 py-3 flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-8 w-8 -ml-2 shrink-0" onClick={handleBack}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-sm font-semibold truncate">{getPageTitle(wizard.step)}</h1>
      </div>

      {/* Step content */}
      <div className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full overflow-x-hidden">
        {wizard.step === 0 && <Step0BackupNudge onSkip={() => wizard.setStep(1)} />}

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
            addIgnoreRuleWithValues={wizard.addIgnoreRuleWithValues}
            mappedCategoryCol={wizard.columnMapping.category}
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
            onDone={handleDone}
          />
        )}
      </div>
    </div>
  );
}
