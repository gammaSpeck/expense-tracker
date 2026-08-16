import { Expense } from "@/types/expense";

export interface CsvColumnMapping {
  amount: number | null;
  dateTime: number | null;
  dateTimeExtra: number | null;
  dateFormat: string;
  category: number | null;
  description: number | null;
  tags: number[];
}

export type CategoryRule = { kind: "existing"; categoryId: string } | { kind: "create"; name: string };

export interface IgnoreRule {
  columnIndex: number;
  value: string;
}

export interface CsvImportConfig {
  mapping: CsvColumnMapping;
  ignoreRules: IgnoreRule[];
}

export interface ParsedCsv {
  headers: string[];
  rows: string[][];
  fileName: string;
  fileSize: number;
}

// `categoryRules` in CsvImportConfig is keyed by the trimmed source category value.
// DraftExpense carries categoryKey rather than a category id because a
// `{kind:"create"}` rule only obtains an id at write time (importCsvExpenses).
export type DraftExpense = Omit<Expense, "id" | "createdAt" | "updatedAt" | "category"> & {
  categoryKey: string;
};

export interface RowError {
  rowNumber: number; // 1-based data-row number, excluding the header
  field: "amount" | "date";
  rawValue: string;
}

export interface CsvImportPlan {
  totalRows: number;
  drafts: DraftExpense[];
  skippedByRules: number;
  errors: RowError[];
}
