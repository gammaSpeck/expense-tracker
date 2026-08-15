import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useCategories } from "@/hooks/useExpenseData";
import { parseCsvFile } from "@/lib/csvImport";
import { buildCsvImportPlan } from "@/lib/csvImportPlan";
import { detectPreset, SOURCE_PRESETS, type SourcePreset } from "@/lib/csvImportPresets";
import { importCsvExpenses } from "@/db/expenseTrackerDb";
import { capture, captureError } from "@/lib/telemetry";
import type { Category } from "@/types/expense";
import type { CategoryRule, CsvColumnMapping, CsvImportPlan, IgnoreRule, ParsedCsv } from "@/types/csvImport";

export type CsvImportStep = "nudge" | "upload" | "mapping" | "categories" | "preview" | "done";

export type CsvMappingErrorKey = "amount" | "dateTime" | "dateFormat" | "category" | "defaultCategory";

export interface CsvImportState {
  step: CsvImportStep;
  parsed: ParsedCsv | null;
  mapping: CsvColumnMapping;
  setMapping: (mapping: CsvColumnMapping) => void;
  categoryRules: Record<string, CategoryRule>;
  setCategoryRules: (rules: Record<string, CategoryRule>) => void;
  defaultCategoryId: string;
  setDefaultCategoryId: (id: string) => void;
  ignoreRules: IgnoreRule[];
  setIgnoreRules: (rules: IgnoreRule[]) => void;
  isImporting: boolean;
  importedCount: number;
  mappingErrors: Partial<Record<CsvMappingErrorKey, string>>;
  detectedPresetId: string | null;
  categories: Category[];
  plan: CsvImportPlan | null;
  handleFileSelect: (file: File) => Promise<void>;
  applyPreset: (presetId: string) => void;
  goToStep: (target: CsvImportStep) => void;
  runImport: () => Promise<void>;
  reset: () => void;
}

const EMPTY_MAPPING: CsvColumnMapping = {
  amount: null,
  dateTime: null,
  dateTimeExtra: null,
  dateFormat: "",
  category: null,
  description: null,
  tags: [],
};

const MAPPING_CHECKS: [CsvMappingErrorKey, (m: CsvColumnMapping) => boolean, string][] = [
  ["amount", (m) => m.amount === null, "Select the Amount column."],
  ["dateTime", (m) => m.dateTime === null, "Select the Date & time column."],
  ["dateFormat", (m) => m.dateFormat === "", "Enter a date format."],
  ["category", (m) => m.category === null, "Select the Category column."],
];

function mappingValidationErrors(mapping: CsvColumnMapping): Partial<Record<CsvMappingErrorKey, string>> {
  return Object.fromEntries(
    MAPPING_CHECKS.filter(([, failed]) => failed(mapping)).map(([key, , message]) => [key, message]),
  );
}

function presetIgnoreRules(preset: SourcePreset, parsed: ParsedCsv | null): IgnoreRule[] {
  const { columnIndex, values } = preset.ignoreValues;
  const rows = parsed ? parsed.rows : [];
  const presentValues = new Set(rows.map((row) => (row[columnIndex] ?? "").trim()));
  return values.filter((value) => presentValues.has(value)).map((value) => ({ columnIndex, value }));
}

export function useCsvImport(): CsvImportState {
  const categories = useCategories() ?? [];
  const [step, setStep] = useState<CsvImportStep>("nudge");
  const [parsed, setParsed] = useState<ParsedCsv | null>(null);
  const [mapping, setMapping] = useState<CsvColumnMapping>(EMPTY_MAPPING);
  const [categoryRules, setCategoryRules] = useState<Record<string, CategoryRule>>({});
  const [defaultCategoryId, setDefaultCategoryId] = useState("");
  const [ignoreRules, setIgnoreRules] = useState<IgnoreRule[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const [mappingErrors, setMappingErrors] = useState<Partial<Record<CsvMappingErrorKey, string>>>({});
  const [detectedPresetId, setDetectedPresetId] = useState<string | null>(null);

  // Default the write target to "Others" the first time categories load, but only while
  // nothing has been chosen (manual selection and reset() both clear this back to "").
  useEffect(() => {
    if (defaultCategoryId !== "") return;
    const others = categories.find((c) => c.name === "Others");
    if (others) setDefaultCategoryId(others.id);
  }, [categories, defaultCategoryId]);

  const plan = useMemo(
    () =>
      parsed
        ? buildCsvImportPlan(parsed, { mapping, categoryRules, defaultCategoryId, ignoreRules })
        : null,
    [parsed, mapping, categoryRules, defaultCategoryId, ignoreRules],
  );

  function reset() {
    setStep("upload");
    setParsed(null);
    setMapping(EMPTY_MAPPING);
    setCategoryRules({});
    setDefaultCategoryId("");
    setIgnoreRules([]);
    setImportedCount(0);
    setMappingErrors({});
    setDetectedPresetId(null);
  }

  function applyPreset(presetId: string) {
    const preset = SOURCE_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    setMapping(preset.mapping);
    const rules: Record<string, CategoryRule> = {};
    for (const [sourceValue, categoryName] of Object.entries(preset.categoryNames)) {
      const existing = categories.find((c) => c.name === categoryName);
      rules[sourceValue] = existing ? { kind: "existing", categoryId: existing.id } : { kind: "create", name: categoryName };
    }
    setCategoryRules(rules);
    setIgnoreRules(presetIgnoreRules(preset, parsed));
  }

  async function handleFileSelect(file: File) {
    if (parsed) reset();

    try {
      const result = await parseCsvFile(file);
      setParsed(result);
      const preset = detectPreset(result.headers);
      setDetectedPresetId(preset ? preset.id : null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not read this file as CSV");
      captureError("csv_import_failed", err, { stage: "parse" });
    }
  }

  function goToStep(target: CsvImportStep) {
    if (target === "categories") {
      const errors = mappingValidationErrors(mapping);
      if (Object.keys(errors).length > 0) {
        setMappingErrors(errors);
        return;
      }
    }
    if (target === "preview" && defaultCategoryId === "") {
      setMappingErrors({ defaultCategory: "Default category is required" });
      return;
    }
    setMappingErrors({});
    setStep(target);
  }

  async function runImport() {
    if (!plan || plan.drafts.length === 0) return;
    setIsImporting(true);
    try {
      const count = await importCsvExpenses(plan.drafts, categoryRules, defaultCategoryId);
      setImportedCount(count);
      setStep("done");
      capture("csv_import_succeeded", { expenseCount: count });
      toast.success(`Imported ${count.toLocaleString()} expenses`);
    } catch (err) {
      toast.error("Import failed");
      captureError("csv_import_failed", err, { stage: "write" });
    } finally {
      setIsImporting(false);
    }
  }

  return {
    step,
    parsed,
    mapping,
    setMapping,
    categoryRules,
    setCategoryRules,
    defaultCategoryId,
    setDefaultCategoryId,
    ignoreRules,
    setIgnoreRules,
    isImporting,
    importedCount,
    mappingErrors,
    detectedPresetId,
    categories,
    plan,
    handleFileSelect,
    applyPreset,
    goToStep,
    runImport,
    reset,
  };
}
