import { useLiveQuery } from "dexie-react-hooks";
import { db, getAllExpenses, getAllCategories, getAllTags } from "@/db/expenseTrackerDb";
import { Expense, ExpenseFilters, AnalysisSummary } from "@/types/expense";
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
import { buildCategoryBreakdown, buildDailyTrend } from "@/lib/expenseAnalysis";

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

export function useExpense(id: string | undefined) {
  const expense = useLiveQuery(() => (id ? db.expenses.get(id) : undefined), [id], undefined);
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
      filtered = filtered.filter((expense) => filters.categories!.includes(expense.category));
    }

    // Tag filter
    if (filters.tags && filters.tags.length > 0) {
      filtered = filtered.filter((expense) =>
        expense.tags.some((tag) => filters.tags!.includes(tag)),
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
    const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + exp.value, 0);
    const totalTransactions = filteredExpenses.length;
    const averageExpense = totalTransactions > 0 ? totalExpenses / totalTransactions : 0;

    const categoryBreakdown = buildCategoryBreakdown(filteredExpenses, categories, totalExpenses);
    const topCategory = categoryBreakdown[0] || null;
    const dailyTrend = buildDailyTrend(filteredExpenses);

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
  customRange?: { start: Date; end: Date },
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
