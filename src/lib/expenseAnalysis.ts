import { Category, CategorySummary, DailySummary, Expense } from "@/types/expense";

export function buildCategoryBreakdown(
  expenses: Expense[],
  categories: Category[],
  totalExpenses: number,
): CategorySummary[] {
  const categoryTotals: Record<string, { total: number; count: number }> = {};

  for (const expense of expenses) {
    if (!categoryTotals[expense.category]) {
      categoryTotals[expense.category] = { total: 0, count: 0 };
    }
    categoryTotals[expense.category].total += expense.value;
    categoryTotals[expense.category].count += 1;
  }

  return Object.entries(categoryTotals)
    .map(([categoryId, { total, count }]) => {
      const category = categories.find((c) => c.id === categoryId);
      return {
        categoryId,
        categoryName: category?.name || "Unknown",
        categoryColor: category?.color || "#64748B",
        categoryIcon: category?.icon || "MoreHorizontal",
        total,
        count,
        percentage: totalExpenses > 0 ? (total / totalExpenses) * 100 : 0,
      };
    })
    .sort((a, b) => b.total - a.total);
}

export function buildDailyTrend(expenses: Expense[]): DailySummary[] {
  const dailyTotals: Record<string, { total: number; count: number }> = {};

  for (const expense of expenses) {
    if (!dailyTotals[expense.date]) {
      dailyTotals[expense.date] = { total: 0, count: 0 };
    }
    dailyTotals[expense.date].total += expense.value;
    dailyTotals[expense.date].count += 1;
  }

  return Object.entries(dailyTotals)
    .map(([date, { total, count }]) => ({ date, total, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
