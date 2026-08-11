import { useMemo, useState } from "react";
import { aggregateTrendData, getGranularityOptions, TrendGranularity } from "@/components/analysis/analysisUtils";
import { TimePeriod, DateRange, DailySummary } from "@/types/expense";

export function useTrendGranularity(
  periodTab: TimePeriod,
  customRange: DateRange | undefined,
  dailyTrend: DailySummary[],
) {
  const [trendGranularity, setTrendGranularity] = useState<TrendGranularity>("day");

  const granularityOptions = useMemo(
    () => getGranularityOptions(periodTab, customRange),
    [periodTab, customRange],
  );

  const barData = useMemo(
    () => aggregateTrendData(dailyTrend, trendGranularity),
    [dailyTrend, trendGranularity],
  );

  return { trendGranularity, setTrendGranularity, granularityOptions, barData };
}
