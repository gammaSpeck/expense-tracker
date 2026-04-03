import { useState, useCallback, useMemo } from "react";
import { parse, format, isValid } from "date-fns";
import type { Expense, Category } from "@/types/expense";

export interface ColumnMapping {
  amount: string | null;
  date: string | null;
  dateRegex: string;
  time: string | null;
  timeRegex: string;
  category: string | null;
  description: string | null;
  tagColumns: string[];
  isAdhoc: string | null;
}

export interface IgnoreRule {
  column: string;
  value: string;
}

export interface DataError {
  rowIndex: number;
  field: string;
  rawValue: string;
}

export interface CsvImportState {
  step: number;
  csvHeaders: string[];
  csvRows: Record<string, string>[];
  columnMapping: ColumnMapping;
  uniqueCategoryValues: string[];
  categoryRules: Record<string, string>;
  defaultCategoryId: string;
  ignoreRules: IgnoreRule[];
  validRows: Expense[];
  skippedByRules: number;
  dataErrors: DataError[];
}

const DEFAULT_COLUMN_MAPPING: ColumnMapping = {
  amount: null,
  date: null,
  dateRegex: "(\\d{2}\\/\\d{2}\\/\\d{4})",
  time: null,
  timeRegex: "(\\d{2}:\\d{2}:\\d{2})",
  category: null,
  description: null,
  tagColumns: [],
  isAdhoc: null,
};

export function useCsvImport(categories: Category[]) {
  const [step, setStep] = useState(0);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>(DEFAULT_COLUMN_MAPPING);
  const [categoryRules, setCategoryRules] = useState<Record<string, string>>({});
  const [defaultCategoryId, setDefaultCategoryId] = useState("");
  const [ignoreRules, setIgnoreRules] = useState<IgnoreRule[]>([]);
  const [validRows, setValidRows] = useState<Expense[]>([]);
  const [skippedByRules, setSkippedByRules] = useState(0);
  const [dataErrors, setDataErrors] = useState<DataError[]>([]);

  const uniqueCategoryValues = useMemo(() => {
    if (!columnMapping.category) return [];
    const col = columnMapping.category;
    const values = new Set<string>();
    for (const row of csvRows) {
      const v = (row[col] ?? "").trim();
      if (v) values.add(v);
    }
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [csvRows, columnMapping.category]);

  // Auto-set default category to "Others" on first load
  const othersCategory = useMemo(
    () => categories.find((c) => c.name === "Others"),
    [categories],
  );

  const setStepSafe = useCallback((s: number) => {
    setStep(s);
  }, []);

  const setParsedData = useCallback((headers: string[], rows: Record<string, string>[]) => {
    setCsvHeaders(headers);
    setCsvRows(rows);
  }, []);

  const updateColumnMapping = useCallback((key: keyof ColumnMapping, value: unknown) => {
    setColumnMapping((prev) => ({ ...prev, [key]: value }));
  }, []);

  const addIgnoreRule = useCallback(() => {
    setIgnoreRules((prev) => [...prev, { column: "", value: "" }]);
  }, []);

  const updateIgnoreRule = useCallback((index: number, rule: IgnoreRule) => {
    setIgnoreRules((prev) => prev.map((r, i) => (i === index ? rule : r)));
  }, []);

  const removeIgnoreRule = useCallback((index: number) => {
    setIgnoreRules((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const runTransformation = useCallback(() => {
    const valid: Expense[] = [];
    const errors: DataError[] = [];
    let skipped = 0;
    const now = new Date().toISOString();

    const dateCol = columnMapping.date!;
    const amountCol = columnMapping.amount!;
    const catCol = columnMapping.category!;
    const timeCol = columnMapping.time;
    const descCol = columnMapping.description;
    const adhocCol = columnMapping.isAdhoc;
    const tagCols = columnMapping.tagColumns;
    const dateRegex = columnMapping.dateRegex ? safeRegex(columnMapping.dateRegex) : null;
    const timeRegex = columnMapping.timeRegex ? safeRegex(columnMapping.timeRegex) : null;

    for (let i = 0; i < csvRows.length; i++) {
      const row = csvRows[i];

      // System rules
      const rawDate = (row[dateCol] ?? "").trim();
      if (!rawDate) { skipped++; continue; }
      const rawAmount = (row[amountCol] ?? "").trim();
      if (!rawAmount || isNaN(parseFloat(rawAmount))) { skipped++; continue; }

      // Custom ignore rules
      let ignored = false;
      for (const rule of ignoreRules) {
        if (rule.column && rule.value && (row[rule.column] ?? "") === rule.value) {
          ignored = true;
          break;
        }
      }
      if (ignored) { skipped++; continue; }

      // Date parsing
      let dateExtracted = rawDate;
      if (dateRegex) {
        const m = rawDate.match(dateRegex);
        if (m?.[1]) dateExtracted = m[1];
      }

      let parsedDate: Date | null = null;
      // Try DD/MM/YYYY first
      const d1 = parse(dateExtracted, "dd/MM/yyyy", new Date());
      if (isValid(d1)) { parsedDate = d1; }
      else {
        // Try YYYY-MM-DD
        const d2 = parse(dateExtracted, "yyyy-MM-dd", new Date());
        if (isValid(d2)) { parsedDate = d2; }
        else {
          // Try MM/DD/YYYY
          const d3 = parse(dateExtracted, "MM/dd/yyyy", new Date());
          if (isValid(d3)) parsedDate = d3;
        }
      }

      if (!parsedDate) {
        errors.push({ rowIndex: i, field: "Date", rawValue: dateExtracted });
        continue;
      }

      const formattedDate = format(parsedDate, "yyyy-MM-dd");

      // Amount parsing
      const amount = parseFloat(rawAmount);
      if (isNaN(amount) || amount <= 0) {
        errors.push({ rowIndex: i, field: "Amount", rawValue: rawAmount });
        continue;
      }

      // Time parsing
      let formattedTime = "00:00";
      if (timeCol) {
        const rawTime = (row[timeCol] ?? "").trim();
        if (rawTime) {
          let timeExtracted = rawTime;
          if (timeRegex) {
            const tm = rawTime.match(timeRegex);
            if (tm?.[1]) timeExtracted = tm[1];
          }
          // Try HH:mm:ss then HH:mm
          const t1 = parse(timeExtracted, "HH:mm:ss", new Date());
          if (isValid(t1)) { formattedTime = format(t1, "HH:mm"); }
          else {
            const t2 = parse(timeExtracted, "HH:mm", new Date());
            if (isValid(t2)) formattedTime = format(t2, "HH:mm");
          }
        }
      }

      // Category
      const rawCat = (row[catCol] ?? "").trim();
      const resolvedCatId = rawCat && categoryRules[rawCat]
        ? categoryRules[rawCat]
        : defaultCategoryId;

      // Tags
      const tags: string[] = [];
      for (const tc of tagCols) {
        const v = (row[tc] ?? "").trim();
        if (v && !tags.includes(v)) tags.push(v);
      }

      // Description
      const description = descCol ? (row[descCol] ?? "").trim() || undefined : undefined;

      // isAdhoc
      let isAdhoc = false;
      if (adhocCol) {
        const v = (row[adhocCol] ?? "").trim().toLowerCase();
        isAdhoc = v === "true" || v === "1" || v === "yes";
      }

      valid.push({
        id: crypto.randomUUID(),
        value: amount,
        category: resolvedCatId,
        description,
        tags,
        date: formattedDate,
        time: formattedTime,
        isAdhoc,
        createdAt: now,
        updatedAt: now,
      });
    }

    setValidRows(valid);
    setSkippedByRules(skipped);
    setDataErrors(errors);
  }, [csvRows, columnMapping, categoryRules, defaultCategoryId, ignoreRules]);

  const resetAll = useCallback(() => {
    setStep(0);
    setCsvHeaders([]);
    setCsvRows([]);
    setColumnMapping(DEFAULT_COLUMN_MAPPING);
    setCategoryRules({});
    setDefaultCategoryId(othersCategory?.id ?? "");
    setIgnoreRules([]);
    setValidRows([]);
    setSkippedByRules(0);
    setDataErrors([]);
  }, [othersCategory?.id]);

  return {
    step, setStep: setStepSafe,
    csvHeaders, csvRows, setParsedData,
    columnMapping, updateColumnMapping, setColumnMapping,
    uniqueCategoryValues,
    categoryRules, setCategoryRules,
    defaultCategoryId, setDefaultCategoryId,
    ignoreRules, addIgnoreRule, updateIgnoreRule, removeIgnoreRule,
    validRows, skippedByRules, dataErrors,
    runTransformation,
    resetAll,
    othersCategory,
  };
}

function safeRegex(pattern: string): RegExp | null {
  try {
    return new RegExp(pattern);
  } catch {
    return null;
  }
}
