import { useLiveQuery } from "dexie-react-hooks";
import { db, getAllExpenses, getAllCategories, getAllTags } from "@/lib/db";
import {
  Expense,
  ExpenseFilters,
  AnalysisSummary,
  CategorySummary,
  DailySummary,
} from "@/types/expense";
import { useMemo } from "react";
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  parseISO,
  isWithinInterval,
} from "date-fns";

export function useExpenses() {
  const expenses = useLiveQuery(() => getAllExpenses(), [], []);
  return expenses as Expense[];
}

export function useCategories() {
  const categories = useLiveQuery(() => getAllCategories(), [], []);
  return categories;
}

export function useTags() {
  const tags = useLiveQuery(() => getAllTags(), [], []);
  return tags;
}

export function useCategory(id: string | undefined) {
  const category = useLiveQuery(
    () => (id ? db.categories.get(id) : undefined),
    [id],
    undefined
  );
  return category;
}

export function useExpense(id: string | undefined) {
  const expense = useLiveQuery(
    () => (id ? db.expenses.get(id) : undefined),
    [id],
    undefined
  );
  return expense;
}

export function useCategoryExpenseCounts() {
  const expenses = useExpenses();

  return useMemo(() => {
    const counts: Record<string, number> = {};
    for (const expense of expenses) {
      counts[expense.category] = (counts[expense.category] || 0) + 1;
    }
    return counts;
  }, [expenses]);
}

export function useFilteredExpenses(filters: ExpenseFilters = {}) {
  const expenses = useExpenses();
  const categories = useCategories();

  return useMemo(() => {
    let filtered = [...expenses];

    // Search filter
    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter((expense) => {
        const category = categories.find((c) => c.id === expense.category);
        return (
          expense.description?.toLowerCase().includes(search) ||
          category?.name.toLowerCase().includes(search) ||
          expense.tags.some((tag) => tag.toLowerCase().includes(search))
        );
      });
    }

    // Category filter
    if (filters.categories && filters.categories.length > 0) {
      filtered = filtered.filter((expense) =>
        filters.categories!.includes(expense.category)
      );
    }

    // Tag filter
    if (filters.tags && filters.tags.length > 0) {
      filtered = filtered.filter((expense) =>
        expense.tags.some((tag) => filters.tags!.includes(tag))
      );
    }

    // Date range filter
    if (filters.dateRange) {
      filtered = filtered.filter((expense) => {
        const expenseDate = parseISO(expense.date);
        return isWithinInterval(expenseDate, {
          start: filters.dateRange!.start,
          end: filters.dateRange!.end,
        });
      });
    }

    // Adhoc filter
    if (filters.includeAdhoc === false) {
      filtered = filtered.filter((expense) => !expense.isAdhoc);
    }

    return filtered;
  }, [expenses, categories, filters]);
}

export function useAnalysisSummary(filters: ExpenseFilters): AnalysisSummary {
  const filteredExpenses = useFilteredExpenses(filters);
  const categories = useCategories();

  return useMemo(() => {
    const totalExpenses = filteredExpenses.reduce(
      (sum, exp) => sum + exp.value,
      0
    );
    const totalTransactions = filteredExpenses.length;
    const averageExpense =
      totalTransactions > 0 ? totalExpenses / totalTransactions : 0;

    // Category breakdown
    const categoryTotals: Record<string, { total: number; count: number }> = {};

    for (const expense of filteredExpenses) {
      if (!categoryTotals[expense.category]) {
        categoryTotals[expense.category] = { total: 0, count: 0 };
      }
      categoryTotals[expense.category].total += expense.value;
      categoryTotals[expense.category].count += 1;
    }

    const categoryBreakdown: CategorySummary[] = Object.entries(categoryTotals)
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

    const topCategory = categoryBreakdown[0] || null;

    // Daily trend
    const dailyTotals: Record<string, { total: number; count: number }> = {};

    for (const expense of filteredExpenses) {
      if (!dailyTotals[expense.date]) {
        dailyTotals[expense.date] = { total: 0, count: 0 };
      }
      dailyTotals[expense.date].total += expense.value;
      dailyTotals[expense.date].count += 1;
    }

    const dailyTrend: DailySummary[] = Object.entries(dailyTotals)
      .map(([date, { total, count }]) => ({ date, total, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalExpenses,
      totalTransactions,
      averageExpense,
      topCategory,
      categoryBreakdown,
      dailyTrend,
    };
  }, [filteredExpenses, categories]);
}

export function useMonthSummary() {
  const expenses = useExpenses();

  return useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    let total = 0;
    let totalExcludingAdhoc = 0;

    for (const expense of expenses) {
      const expenseDate = parseISO(expense.date);
      if (isWithinInterval(expenseDate, { start: monthStart, end: monthEnd })) {
        total += expense.value;
        if (!expense.isAdhoc) {
          totalExcludingAdhoc += expense.value;
        }
      }
    }

    return {
      total,
      totalExcludingAdhoc,
      monthStart,
      monthEnd,
    };
  }, [expenses]);
}

export function useRecentExpenses(limit: number = 10) {
  const expenses = useExpenses();

  return useMemo(() => {
    return expenses.slice(0, limit);
  }, [expenses, limit]);
}

export function getDateRangeForPeriod(
  period: "week" | "month" | "year",
  anchorDate?: Date,
  customRange?: { start: Date; end: Date }
) {
  const date = anchorDate || new Date();

  switch (period) {
    case "week":
      return {
        start: startOfWeek(date, { weekStartsOn: 1 }),
        end: endOfWeek(date, { weekStartsOn: 1 }),
      };
    case "month":
      return { start: startOfMonth(date), end: endOfMonth(date) };
    case "year":
      return { start: startOfYear(date), end: endOfYear(date) };
    default:
      return customRange || { start: startOfMonth(date), end: endOfMonth(date) };
  }
}
