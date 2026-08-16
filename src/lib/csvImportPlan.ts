import { parse, isValid, format } from "date-fns";
import type { CsvColumnMapping, CsvImportConfig, CsvImportPlan, DraftExpense, IgnoreRule, ParsedCsv, RowError } from "@/types/csvImport";

const REFERENCE_DATE = new Date(2000, 0, 1, 0, 0, 0, 0);

function cell(row: string[], index: number | null): string {
  if (index === null || index < 0 || index >= row.length) return "";
  return row[index].trim();
}

function isIgnored(row: string[], rules: IgnoreRule[]): boolean {
  return rules.some((rule) => cell(row, rule.columnIndex) === rule.value);
}

// A separator followed by 1-2 digits is the decimal point; anything else is a
// thousands separator. Handles 1,234.56 and 1.234,56 without guessing a locale.
function normalizeAmount(s: string): string {
  const lastSep = Math.max(s.lastIndexOf("."), s.lastIndexOf(","));
  const decimals = lastSep === -1 ? 0 : s.length - lastSep - 1;
  const isDecimalPoint = decimals >= 1 && decimals <= 2;
  return isDecimalPoint
    ? s.slice(0, lastSep).replace(/[.,]/g, "") + "." + s.slice(lastSep + 1)
    : s.replace(/[.,]/g, "");
}

function parseAmount(raw: string): number | null {
  const n = Math.abs(Number(normalizeAmount(raw.replace(/[^\d.,-]/g, ""))));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function parseDateTime(row: string[], mapping: CsvColumnMapping): { date: string; time: string } | null {
  const joined = [cell(row, mapping.dateTime), cell(row, mapping.dateTimeExtra)].filter(Boolean).join(" ");
  const parsed = parse(joined, mapping.dateFormat, REFERENCE_DATE);
  if (!isValid(parsed)) return null;
  return { date: format(parsed, "yyyy-MM-dd"), time: format(parsed, "HH:mm") };
}

function collectTags(row: string[], indexes: number[]): string[] {
  const tags: string[] = [];
  for (const index of indexes) {
    const value = cell(row, index);
    if (value && !tags.includes(value)) tags.push(value);
  }
  return tags;
}

type RowResult =
  | { kind: "skip" }
  | { kind: "error"; error: RowError }
  | { kind: "draft"; draft: DraftExpense };

function resolveRow(
  row: string[],
  rowNumber: number,
  mapping: CsvColumnMapping,
  ignoreRules: IgnoreRule[],
): RowResult {
  if (isIgnored(row, ignoreRules)) return { kind: "skip" };

  const rawAmount = cell(row, mapping.amount);
  if (rawAmount === "") return { kind: "skip" };
  const value = parseAmount(rawAmount);
  if (value === null) return { kind: "error", error: { rowNumber, field: "amount", rawValue: rawAmount } };

  const rawDate = cell(row, mapping.dateTime);
  if (rawDate === "") return { kind: "skip" };
  const dateTime = parseDateTime(row, mapping);
  if (dateTime === null) return { kind: "error", error: { rowNumber, field: "date", rawValue: rawDate } };

  return {
    kind: "draft",
    draft: {
      value,
      date: dateTime.date,
      time: dateTime.time,
      categoryKey: cell(row, mapping.category),
      description: cell(row, mapping.description) || undefined,
      tags: collectTags(row, mapping.tags),
      isAdhoc: false,
    },
  };
}

export function buildCsvImportPlan(parsed: ParsedCsv, config: CsvImportConfig): CsvImportPlan {
  const { mapping, ignoreRules } = config;
  const plan: CsvImportPlan = { totalRows: parsed.rows.length, drafts: [], skippedByRules: 0, errors: [] };

  parsed.rows.forEach((row, i) => {
    const result = resolveRow(row, i + 1, mapping, ignoreRules);
    if (result.kind === "skip") plan.skippedByRules++;
    else if (result.kind === "error") plan.errors.push(result.error);
    else plan.drafts.push(result.draft);
  });

  return plan;
}
