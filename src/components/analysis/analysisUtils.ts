import { format, parseISO, startOfWeek, endOfWeek, differenceInDays, isSameMonth } from "date-fns";
import type { TimePeriod, DateRange, DailySummary } from "@/types/expense";

export type TrendGranularity = "day" | "week" | "month";

export function formatPeriodDisplay(
  periodTab: TimePeriod,
  selectedDate: Date,
  dateRange: DateRange,
): string {
  switch (periodTab) {
    case "week": {
      const start = dateRange.start;
      const end = dateRange.end;
      if (isSameMonth(start, end)) {
        return `${format(start, "MMM d")} - ${format(end, "d")}`;
      }
      return `${format(start, "MMM d")} - ${format(end, "MMM d")}`;
    }
    case "month":
      return format(selectedDate, "MMM yyyy");
    case "year":
      return format(selectedDate, "yyyy");
    case "custom":
      return `${format(dateRange.start, "MMM d")} - ${format(dateRange.end, "MMM d, yyyy")}`;
  }
}

export function getGranularityOptions(
  periodTab: TimePeriod,
  customRange?: DateRange,
): TrendGranularity[] {
  switch (periodTab) {
    case "week":
      return ["day"];
    case "month":
      return ["day", "week"];
    case "year":
      return ["day", "week", "month"];
    case "custom": {
      if (!customRange) return ["day"];
      const days = differenceInDays(customRange.end, customRange.start);
      if (days <= 14) return ["day"];
      if (days <= 90) return ["day", "week"];
      return ["day", "week", "month"];
    }
  }
}

export function aggregateTrendData(
  dailyData: DailySummary[],
  granularity: TrendGranularity,
): Array<{ label: string; amount: number }> {
  if (granularity === "day") {
    return dailyData.map((d) => ({
      label: format(parseISO(d.date), "MMM d"),
      amount: d.total,
    }));
  }

  if (granularity === "week") {
    const weeks = new Map<string, { label: string; amount: number }>();
    for (const d of dailyData) {
      const date = parseISO(d.date);
      const weekStart = startOfWeek(date, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
      const key = format(weekStart, "yyyy-MM-dd");
      if (!weeks.has(key)) {
        const label = isSameMonth(weekStart, weekEnd)
          ? `${format(weekStart, "MMM d")} - ${format(weekEnd, "d")}`
          : `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d")}`;
        weeks.set(key, { label, amount: 0 });
      }
      weeks.get(key)!.amount += d.total;
    }
    return Array.from(weeks.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v);
  }

  // month
  const months = new Map<string, { label: string; amount: number }>();
  for (const d of dailyData) {
    const date = parseISO(d.date);
    const key = format(date, "yyyy-MM");
    if (!months.has(key)) {
      months.set(key, { label: format(date, "MMM"), amount: 0 });
    }
    months.get(key)!.amount += d.total;
  }
  return Array.from(months.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v);
}
