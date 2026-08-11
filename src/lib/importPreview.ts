import { Expense, Category } from "@/types/expense";

export interface ImportPreview {
  expenseCount: number;
  categoryCount: number;
  dateRange: {
    earliest: string;
    latest: string;
  };
  data: { expenses: Expense[]; categories: Category[] };
}

export function buildImportPreview(jsonText: string): ImportPreview | null {
  try {
    const data = JSON.parse(jsonText);
    if (!data.expenses || !data.categories) throw new Error("Invalid backup file");

    const sortedExpenses = [...data.expenses].sort((a: Expense, b: Expense) =>
      a.date.localeCompare(b.date),
    );

    return {
      expenseCount: data.expenses.length,
      categoryCount: data.categories.length,
      dateRange: {
        earliest: sortedExpenses[0]?.date || "N/A",
        latest: sortedExpenses[sortedExpenses.length - 1]?.date || "N/A",
      },
      data,
    };
  } catch {
    return null;
  }
}

export function validateImportFile(file: File): string | null {
  if (file.size > 10 * 1024 * 1024) return "File too large (max 10 MB)";
  return null;
}
