import { useEffect, useMemo, useRef, useState } from "react";
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

function buildPresetCategoryRules(preset: SourcePreset, categories: Category[]): Record<string, CategoryRule> {
  const rules: Record<string, CategoryRule> = {};
  for (const [sourceValue, categoryName] of Object.entries(preset.categoryNames)) {
    const existing = categories.find((c) => c.name === categoryName);
    rules[sourceValue] = existing
      ? { kind: "existing", categoryId: existing.id }
      : { kind: "create", name: categoryName };
  }
  return rules;
}

function validateStepTransition(
  target: CsvImportStep,
  mapping: CsvColumnMapping,
  defaultCategoryId: string,
): Partial<Record<CsvMappingErrorKey, string>> | null {
  if (target === "categories") {
    const errors = mappingValidationErrors(mapping);
    if (Object.keys(errors).length > 0) return errors;
  }
  if (target === "preview" && defaultCategoryId === "") {
    return { defaultCategory: "Default category is required" };
  }
  return null;
}

async function parseAndDetect(
  file: File,
): Promise<{ result: ParsedCsv; presetId: string | null } | null> {
  try {
    const result = await parseCsvFile(file);
    const preset = detectPreset(result.headers);
    return { result, presetId: preset ? preset.id : null };
  } catch (err) {
    toast.error(err instanceof Error ? err.message : "Could not read this file as CSV");
    captureError("csv_import_failed", err, { stage: "parse" });
    return null;
  }
}

async function performImport(
  plan: CsvImportPlan,
  categoryRules: Record<string, CategoryRule>,
  defaultCategoryId: string,
): Promise<number | null> {
  try {
    const count = await importCsvExpenses(plan.drafts, categoryRules, defaultCategoryId);
    capture("csv_import_succeeded", { expenseCount: count });
    toast.success(`Imported ${count.toLocaleString()} expenses`);
    return count;
  } catch (err) {
    toast.error("Import failed");
    captureError("csv_import_failed", err, { stage: "write" });
    return null;
  }
}

/** All wizard state plus the derived plan; no mutation logic beyond the "default category"
 *  auto-fill effect. Action functions live in useCsvImport, which composes this. */
function useCsvImportFormState() {
  const categories = useCategories() ?? [];
  const [step, setStep] = useState<CsvImportStep>("nudge");
  const [parsed, setParsed] = useState<ParsedCsv | null>(null);
  const [mapping, setMapping] = useState<CsvColumnMapping>(EMPTY_MAPPING);
  const [categoryRules, setCategoryRules] = useState<Record<string, CategoryRule>>({});
  const [defaultCategoryId, setDefaultCategoryId] = useState("");
  const [ignoreRules, setIgnoreRules] = useState<IgnoreRule[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const isImportingRef = useRef(false);
  // Bumped on every handleFileSelect call and on reset(); a parseAndDetect result is only
  // applied if its captured token still matches, so a slow first pick can't overwrite a
  // faster second pick's already-applied result.
  const fileSelectionRef = useRef(0);
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
    () => (parsed ? buildCsvImportPlan(parsed, { mapping, ignoreRules }) : null),
    [parsed, mapping, ignoreRules],
  );

  return {
    categories,
    step, setStep,
    parsed, setParsed,
    mapping, setMapping,
    categoryRules, setCategoryRules,
    defaultCategoryId, setDefaultCategoryId,
    ignoreRules, setIgnoreRules,
    isImporting, setIsImporting, isImportingRef,
    fileSelectionRef,
    importedCount, setImportedCount,
    mappingErrors, setMappingErrors,
    detectedPresetId, setDetectedPresetId,
    plan,
  };
}

function resetImportState(state: ReturnType<typeof useCsvImportFormState>) {
  state.fileSelectionRef.current += 1;
  state.setStep("upload");
  state.setParsed(null);
  state.setMapping(EMPTY_MAPPING);
  state.setCategoryRules({});
  state.setDefaultCategoryId("");
  state.setIgnoreRules([]);
  state.setImportedCount(0);
  state.setMappingErrors({});
  state.setDetectedPresetId(null);
}

function toCsvImportState(
  state: ReturnType<typeof useCsvImportFormState>,
  actions: {
    handleFileSelect: (file: File) => Promise<void>;
    applyPreset: (presetId: string) => void;
    goToStep: (target: CsvImportStep) => void;
    runImport: () => Promise<void>;
    reset: () => void;
  },
): CsvImportState {
  return {
    step: state.step,
    parsed: state.parsed,
    mapping: state.mapping,
    setMapping: state.setMapping,
    categoryRules: state.categoryRules,
    setCategoryRules: state.setCategoryRules,
    defaultCategoryId: state.defaultCategoryId,
    setDefaultCategoryId: state.setDefaultCategoryId,
    ignoreRules: state.ignoreRules,
    setIgnoreRules: state.setIgnoreRules,
    isImporting: state.isImporting,
    importedCount: state.importedCount,
    mappingErrors: state.mappingErrors,
    detectedPresetId: state.detectedPresetId,
    categories: state.categories,
    plan: state.plan,
    ...actions,
  };
}

export function useCsvImport(): CsvImportState {
  const state = useCsvImportFormState();
  const { categories, parsed, mapping, categoryRules, defaultCategoryId, plan, isImportingRef } = state;

  function reset() {
    resetImportState(state);
  }

  function applyPreset(presetId: string) {
    const preset = SOURCE_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    state.setMapping(preset.mapping);
    state.setCategoryRules(buildPresetCategoryRules(preset, categories));
    state.setIgnoreRules(presetIgnoreRules(preset, parsed));
  }

  async function handleFileSelect(file: File) {
    if (parsed) reset();
    const selection = ++state.fileSelectionRef.current;
    const detected = await parseAndDetect(file);
    if (!detected || selection !== state.fileSelectionRef.current) return;
    state.setParsed(detected.result);
    state.setDetectedPresetId(detected.presetId);
  }

  function goToStep(target: CsvImportStep) {
    const errors = validateStepTransition(target, mapping, defaultCategoryId);
    if (errors) {
      state.setMappingErrors(errors);
      return;
    }
    state.setMappingErrors({});
    state.setStep(target);
  }

  async function runImport() {
    if (!plan || plan.drafts.length === 0) return;
    if (isImportingRef.current) return;
    isImportingRef.current = true;
    state.setIsImporting(true);
    const count = await performImport(plan, categoryRules, defaultCategoryId);
    if (count !== null) {
      state.setImportedCount(count);
      state.setStep("done");
    }
    isImportingRef.current = false;
    state.setIsImporting(false);
  }

  return toCsvImportState(state, { handleFileSelect, applyPreset, goToStep, runImport, reset });
}
