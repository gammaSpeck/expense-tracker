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
  movedToOthers: number; // expenses whose category was skipped or missing, reassigned to "Others"
}

function keepValid<T>(items: unknown[], schema: ZodObject, skipped: string[]): T[] {
  return items.filter((item) => {
    const result = schema.safeParse(item);
    if (!result.success) skipped.push(String(result.error.issues[0].path[0] ?? "record"));
    return result.success;
  }) as T[];
}

// An expense whose category didn't survive validation would restore pointing at nothing, so it
// moves to the backup's "Others" category; with no valid "Others" it is skipped as "category".
function attachToKeptCategories(expenses: Expense[], categories: Category[], skipped: string[]) {
  const keptIds = new Set(categories.map((c) => c.id));
  const othersId = categories.find((c) => c.name === "Others")?.id;
  let movedToOthers = 0;
  const attached = expenses.flatMap((e) => {
    if (keptIds.has(e.category)) return [e];
    if (!othersId) {
      skipped.push("category");
      return [];
    }
    movedToOthers++;
    return [{ ...e, category: othersId }];
  });
  return { attached, movedToOthers };
}

export function buildImportPreview(jsonText: string): ImportPreview | null {
  try {
    const data = JSON.parse(jsonText);
    if (!Array.isArray(data.expenses) || !Array.isArray(data.categories)) return null;

    const skipped: string[] = [];
    const categories = keepValid<Category>(data.categories, categoryRecordSchema, skipped);
    const { attached: expenses, movedToOthers } = attachToKeptCategories(
      keepValid<Expense>(data.expenses, expenseRecordSchema, skipped),
      categories,
      skipped,
    );
    if (expenses.length === 0 && categories.length === 0) return null;

    const dates = expenses.map((e) => e.date).sort();
    return {
      expenseCount: expenses.length,
      categoryCount: categories.length,
      dateRange: { earliest: dates[0] ?? "N/A", latest: dates[dates.length - 1] ?? "N/A" },
      data: { expenses, categories },
      skipped,
      movedToOthers,
    };
  } catch {
    return null;
  }
}
