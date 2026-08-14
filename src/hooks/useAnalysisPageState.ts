import { useMemo, useState } from "react";
import { useAnalysisSummary, useCategories } from "@/hooks/useExpenseData";
import { ExpenseFilters } from "@/types/expense";
import { useCurrency } from "@/contexts/CurrencyContext";
import { computePieData } from "@/components/analysis/analysisUtils";
import { useAnalysisPeriod } from "@/hooks/useAnalysisPeriod";
import { useTrendGranularity } from "@/hooks/useTrendGranularity";
import { useExportHandlers } from "@/hooks/useExportHandlers";

/** Owns all AnalysisPage state: period, filters, summary, chart data, and export wiring. */
export function useAnalysisPageState() {
  const [excludeAdhoc, setExcludeAdhoc] = useState(true);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const categories = useCategories();
  const { currency, formatValue } = useCurrency();

  const period = useAnalysisPeriod();
  const { periodTab, customRange, dateRange } = period;

  const filters: ExpenseFilters = {
    dateRange,
    includeAdhoc: !excludeAdhoc,
  };
  const summary = useAnalysisSummary(filters);

  const granularity = useTrendGranularity(periodTab, customRange, summary.dailyTrend);

  // Reset granularity when period changes
  const handlePeriodChange = (value: string) => {
    period.handlePeriodTabChange(value);
    granularity.setTrendGranularity("day");
  };

  const { nonZeroCategories, pieData } = useMemo(
    () => computePieData(summary.categoryBreakdown),
    [summary.categoryBreakdown],
  );

  const { handleExportCSV, handleExportJSON } = useExportHandlers(categories, () =>
    setShowExportDialog(false),
  );

  return {
    excludeAdhoc,
    setExcludeAdhoc,
    period,
    periodTab,
    customRange,
    summary,
    granularity,
    handlePeriodChange,
    nonZeroCategories,
    pieData,
    currency,
    formatValue,
    showExportDialog,
    setShowExportDialog,
    handleExportCSV,
    handleExportJSON,
  };
}
