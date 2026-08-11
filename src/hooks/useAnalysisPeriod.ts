import { useCallback, useMemo, useState } from "react";
import { addMonths, addWeeks, addYears, subMonths, subWeeks, subYears } from "date-fns";
import { getDateRangeForPeriod } from "@/hooks/useExpenseData";
import { formatPeriodDisplay } from "@/components/analysis/analysisUtils";
import { TimePeriod, DateRange } from "@/types/expense";

function stepPeriod(date: Date, periodTab: TimePeriod, direction: 1 | -1): Date {
  switch (periodTab) {
    case "week":
      return direction === 1 ? addWeeks(date, 1) : subWeeks(date, 1);
    case "month":
      return direction === 1 ? addMonths(date, 1) : subMonths(date, 1);
    case "year":
      return direction === 1 ? addYears(date, 1) : subYears(date, 1);
    default:
      return date;
  }
}

export function useAnalysisPeriod() {
  const [periodTab, setPeriodTab] = useState<TimePeriod>("month");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [customRange, setCustomRange] = useState<DateRange | undefined>();

  // Compute date range from period + anchor
  const dateRange = useMemo(() => {
    if (periodTab === "custom" && customRange) {
      return customRange;
    }
    if (periodTab === "custom") {
      return getDateRangeForPeriod("month", selectedDate);
    }
    return getDateRangeForPeriod(periodTab as "week" | "month" | "year", selectedDate);
  }, [periodTab, selectedDate, customRange]);

  const periodDisplay = useMemo(
    () => formatPeriodDisplay(periodTab, selectedDate, dateRange),
    [periodTab, selectedDate, dateRange],
  );

  const handlePeriodTabChange = useCallback((value: string) => {
    setPeriodTab(value as TimePeriod);
    setSelectedDate(new Date());
  }, []);

  const goToPreviousPeriod = useCallback(() => {
    setSelectedDate((prev) => stepPeriod(prev, periodTab, -1));
  }, [periodTab]);

  const goToNextPeriod = useCallback(() => {
    setSelectedDate((prev) => stepPeriod(prev, periodTab, 1));
  }, [periodTab]);

  return {
    periodTab,
    customRange,
    setCustomRange,
    dateRange,
    periodDisplay,
    handlePeriodTabChange,
    goToPreviousPeriod,
    goToNextPeriod,
  };
}
