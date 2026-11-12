import type { ZodObject } from "zod";
import { Expense, Category } from "@/types/expense";
import { categoryRecordSchema, expenseRecordSchema } from "@/db/recordSchemas";

export interface ImportPreview {
  expenseCount: number;
  categoryCount: number;
  dateRange: {
    earliest: string;
    latest: string;
  };
  data: { expenses: Expense[]; categories: Category[] };
  skipped: string[]; // first failing field name per skipped record
}

function keepValid<T>(items: unknown[], schema: ZodObject, skipped: string[]): T[] {
  return items.filter((item) => {
    const result = schema.safeParse(item);
    if (!result.success) skipped.push(String(result.error.issues[0].path[0] ?? "record"));
    return result.success;
  }) as T[];
}

export function buildImportPreview(jsonText: string): ImportPreview | null {
  try {
    const data = JSON.parse(jsonText);
    if (!Array.isArray(data.expenses) || !Array.isArray(data.categories)) return null;

    const skipped: string[] = [];
    const expenses = keepValid<Expense>(data.expenses, expenseRecordSchema, skipped);
    const categories = keepValid<Category>(data.categories, categoryRecordSchema, skipped);
    if (expenses.length === 0 && categories.length === 0) return null;

    const dates = expenses.map((e) => e.date).sort();
    return {
      expenseCount: expenses.length,
      categoryCount: categories.length,
      dateRange: { earliest: dates[0] ?? "N/A", latest: dates[dates.length - 1] ?? "N/A" },
      data: { expenses, categories },
      skipped,
    };
  } catch {
    return null;
  }
}

export function validateImportFile(file: File): string | null {
  if (file.size > 10 * 1024 * 1024) return "File too large (max 10 MB)";
  return null;
}
