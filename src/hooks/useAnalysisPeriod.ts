import { useCallback, useMemo, useState } from "react";
import { addMonths, addWeeks, addYears, subMonths, subWeeks, subYears } from "date-fns";
import { getDateRangeForPeriod } from "@/hooks/useExpenseData";
import { formatPeriodDisplay } from "@/components/analysis/analysisUtils";
import { TimePeriod, DateRange } from "@/types/expense";

const ADD_FN: Record<"week" | "month" | "year", (date: Date, amount: number) => Date> = {
  week: addWeeks,
  month: addMonths,
  year: addYears,
};
const SUB_FN: Record<"week" | "month" | "year", (date: Date, amount: number) => Date> = {
  week: subWeeks,
  month: subMonths,
  year: subYears,
};

function stepPeriod(date: Date, periodTab: TimePeriod, direction: 1 | -1): Date {
  if (periodTab === "custom") return date;
  const step = direction === 1 ? ADD_FN[periodTab] : SUB_FN[periodTab];
  return step(date, 1);
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
