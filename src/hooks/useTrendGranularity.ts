import { useMemo, useState } from "react";
import {
  aggregateTrendData,
  getGranularityOptions,
  TrendGranularity,
} from "@/components/analysis/analysisUtils";
import { TimePeriod, DateRange, DailySummary } from "@/types/expense";

export function useTrendGranularity(
  periodTab: TimePeriod,
  customRange: DateRange | undefined,
  dailyTrend: DailySummary[],
) {
  const [selected, setTrendGranularity] = useState<TrendGranularity>("day");

  const granularityOptions = useMemo(
    () => getGranularityOptions(periodTab, customRange),
    [periodTab, customRange],
  );
  // Falls back while the period disallows the pick; widening again restores it.
  const trendGranularity = granularityOptions.includes(selected) ? selected : granularityOptions[0];

  const barData = useMemo(
    () => aggregateTrendData(dailyTrend, trendGranularity),
    [dailyTrend, trendGranularity],
  );

  return { trendGranularity, setTrendGranularity, granularityOptions, barData };
}
