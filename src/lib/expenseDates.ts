import { format, formatDistanceToNow, isToday, isYesterday, parseISO } from "date-fns";
import { Expense } from "@/types/expense";

export function formatRelativeDate(dateStr: string): string {
  const date = parseISO(dateStr);
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return formatDistanceToNow(date, { addSuffix: true });
}

export function getDateGroupLabel(dateStr: string): string {
  const date = parseISO(dateStr);
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "EEEE, d MMM");
}

/** Groups expenses by date, newest date first. */
export function groupExpensesByDate(expenses: Expense[]): Array<[string, Expense[]]> {
  const grouped: Record<string, Expense[]> = {};
  for (const expense of expenses) {
    if (!grouped[expense.date]) grouped[expense.date] = [];
    grouped[expense.date].push(expense);
  }

  return Object.keys(grouped)
    .sort((a, b) => b.localeCompare(a))
    .map((date) => [date, grouped[date]] as [string, Expense[]]);
}
