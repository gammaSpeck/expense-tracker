import { LazyMotion, domAnimation, m } from "framer-motion";
import { CsvNudgeStep } from "@/components/more/import-csv/CsvNudgeStep";
import { CsvUploadStep } from "@/components/more/import-csv/CsvUploadStep";
import { CsvMappingStep } from "@/components/more/import-csv/CsvMappingStep";
import { CsvCategoryStep } from "@/components/more/import-csv/CsvCategoryStep";
import { CsvPreviewStep } from "@/components/more/import-csv/CsvPreviewStep";
import { CsvDoneStep } from "@/components/more/import-csv/CsvDoneStep";
import { CsvFileSummary } from "@/components/more/import-csv/CsvFileSummary";
import { findPreset } from "@/lib/csvImportPresets";
import type { CsvImportState, CsvImportStep } from "@/hooks/useCsvImport";

type ActiveStep = Exclude<CsvImportStep, "done">;

const STEP_LABEL: Record<ActiveStep, string | null> = {
  nudge: null,
  upload: "Upload",
  mapping: "Column Mapping — Step 1 of 3",
  categories: "Category Rules — Step 2 of 3",
  preview: "Preview & Import — Step 3 of 3",
};

const STEP_BODY: Record<ActiveStep, (csv: CsvImportState) => JSX.Element> = {
  nudge: (csv) => <CsvNudgeStep onSkip={() => csv.goToStep("upload")} />,
  upload: (csv) => <CsvUploadStep csv={csv} />,
  mapping: (csv) => <CsvMappingStep csv={csv} />,
  categories: (csv) => <CsvCategoryStep csv={csv} />,
  preview: (csv) => <CsvPreviewStep csv={csv} />,
};

interface CsvImportFlowProps {
  csv: CsvImportState;
}

/** Renders whichever step of the CSV import wizard is active. */
export function CsvImportFlow({ csv }: CsvImportFlowProps) {
  if (csv.step === "done") {
    return (
      <LazyMotion features={domAnimation}>
        <m.div key="done" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <CsvDoneStep importedCount={csv.importedCount} onReset={csv.reset} />
        </m.div>
      </LazyMotion>
    );
  }

  return (
    <LazyMotion features={domAnimation}>
      <m.div key={csv.step} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        {STEP_LABEL[csv.step] && <p className="text-xs text-muted-foreground">{STEP_LABEL[csv.step]}</p>}
        {csv.step !== "upload" && csv.parsed && (
          <CsvFileSummary
            parsed={csv.parsed}
            detectedPreset={findPreset(csv.detectedPresetId)}
            onChangeSource={() => csv.goToStep("upload")}
          />
        )}
        {STEP_BODY[csv.step](csv)}
      </m.div>
    </LazyMotion>
  );
}
