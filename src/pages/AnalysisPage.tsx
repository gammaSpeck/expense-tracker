import { useState, useMemo, useCallback, lazy, Suspense } from "react";
import { LazyMotion, domAnimation, m } from "framer-motion";
import { format, subWeeks, subMonths, subYears, addWeeks, addMonths, addYears } from "date-fns";

import {
  Download,
  TrendingUp,
  Wallet,
  Receipt,
  Award,
  ChevronLeft,
  ChevronRight,
  CalendarIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { CategoryIcon } from "@/components/categories/CategoryIcon";
import { cn } from "@/lib/utils";
import { useAnalysisSummary, useCategories, getDateRangeForPeriod } from "@/hooks/useExpenseData";
import { exportAllData } from "@/db/expenseTrackerDb";
import { TimePeriod, ExpenseFilters, DateRange } from "@/types/expense";
import { toast } from "sonner";
import { useCurrency } from "@/contexts/CurrencyContext";
import ExportDialog from "@/components/analysis/ExportDialog";
import {
  formatPeriodDisplay,
  getGranularityOptions,
  aggregateTrendData,
  TrendGranularity,
} from "@/components/analysis/analysisUtils";

const CategoryBreakdown = lazy(() => import("@/components/analysis/CategoryBreakdown"));
const TrendSection = lazy(() => import("@/components/analysis/TrendSection"));

// --- Component ---

export default function AnalysisPage() {
  const [periodTab, setPeriodTab] = useState<TimePeriod>("month");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [customRange, setCustomRange] = useState<DateRange | undefined>();
  const [excludeAdhoc, setExcludeAdhoc] = useState(true);
  const [trendGranularity, setTrendGranularity] = useState<TrendGranularity>("day");
  const [showExportDialog, setShowExportDialog] = useState(false);
  const categories = useCategories();

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

  const filters: ExpenseFilters = {
    dateRange,
    includeAdhoc: !excludeAdhoc,
  };

  const summary = useAnalysisSummary(filters);
  const { currency, formatValue } = useCurrency();

  // Period display
  const periodDisplay = useMemo(
    () => formatPeriodDisplay(periodTab, selectedDate, dateRange),
    [periodTab, selectedDate, dateRange],
  );

  // Granularity options
  const granularityOptions = useMemo(
    () => getGranularityOptions(periodTab, customRange),
    [periodTab, customRange],
  );

  // Reset granularity when period changes
  const handlePeriodChange = useCallback((value: string) => {
    setPeriodTab(value as TimePeriod);
    setSelectedDate(new Date());
    setTrendGranularity("day");
  }, []);

  // Navigation
  const goToPreviousPeriod = useCallback(() => {
    setSelectedDate((prev) => {
      switch (periodTab) {
        case "week":
          return subWeeks(prev, 1);
        case "month":
          return subMonths(prev, 1);
        case "year":
          return subYears(prev, 1);
        default:
          return prev;
      }
    });
  }, [periodTab]);

  const goToNextPeriod = useCallback(() => {
    setSelectedDate((prev) => {
      switch (periodTab) {
        case "week":
          return addWeeks(prev, 1);
        case "month":
          return addMonths(prev, 1);
        case "year":
          return addYears(prev, 1);
        default:
          return prev;
      }
    });
  }, [periodTab]);

  // Pie chart data
  const nonZeroCategories = summary.categoryBreakdown.filter((cat) => cat.total > 0);

  const totalForPie = nonZeroCategories.reduce((sum, cat) => sum + cat.total, 0);

  const pieData = nonZeroCategories.map((cat) => ({
    name: cat.categoryName,
    value: cat.total,
    color: cat.categoryColor,
    total: totalForPie,
    percentage: totalForPie > 0 ? ((cat.total / totalForPie) * 100).toFixed(1) : "0",
  }));

  // Bar chart data with granularity
  const barData = useMemo(
    () => aggregateTrendData(summary.dailyTrend, trendGranularity),
    [summary.dailyTrend, trendGranularity],
  );

  // Export handlers
  const handleExportCSV = async () => {
    try {
      const data = await exportAllData();
      const csvRows = [
        ["Date", "Time", "Category", "Description", "Value", "Tags", "IsAdhoc"].join(","),
        ...data.expenses.map((e) => {
          const category = categories.find((c) => c.id === e.category);
          return [
            e.date,
            e.time,
            `"${category?.name || "Unknown"}"`,
            `"${e.description || ""}"`,
            e.value,
            `"${e.tags.join(", ")}"`,
            e.isAdhoc,
          ].join(",");
        }),
      ];
      const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `expenses-${format(new Date(), "yyyy-MM-dd")}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Exported successfully");
      setShowExportDialog(false);
    } catch {
      toast.error("Export failed");
    }
  };

  const handleExportJSON = async () => {
    try {
      const data = await exportAllData();
      const exportData = { exportDate: new Date().toISOString(), ...data };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `expenses-${format(new Date(), "yyyy-MM-dd")}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Exported successfully");
      setShowExportDialog(false);
    } catch {
      toast.error("Export failed");
    }
  };

  return (
    <LazyMotion features={domAnimation}>
      <div className="px-4 py-6 max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <m.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-xl font-semibold">Analysis</h1>
        </m.div>

        {/* Period Selector */}
        <m.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="space-y-3 p-4 bg-card rounded-xl border border-border/50"
        >
          {/* Tabs */}
          <Tabs value={periodTab} onValueChange={handlePeriodChange}>
            <TabsList className="w-full">
              <TabsTrigger value="week" className="flex-1">
                Week
              </TabsTrigger>
              <TabsTrigger value="month" className="flex-1">
                Month
              </TabsTrigger>
              <TabsTrigger value="year" className="flex-1">
                Year
              </TabsTrigger>
              <TabsTrigger value="custom" className="flex-1">
                Custom
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Period Navigation */}
          {periodTab !== "custom" && (
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="icon"
                onClick={goToPreviousPeriod}
                aria-label="Previous period"
                className="h-9 w-9"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <span className="text-sm font-semibold">{periodDisplay}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={goToNextPeriod}
                aria-label="Next period"
                className="h-9 w-9"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          )}

          {/* Custom date pickers */}
          {periodTab === "custom" && (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal text-sm",
                        !customRange?.start && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="h-4 w-4" />
                      {customRange?.start ? format(customRange.start, "PP") : "Pick start"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={customRange?.start}
                      onSelect={(date) => {
                        if (date)
                          setCustomRange((prev) => ({
                            start: date,
                            end: prev?.end || date,
                          }));
                      }}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal text-sm",
                        !customRange?.end && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="h-4 w-4" />
                      {customRange?.end ? format(customRange.end, "PP") : "Pick end"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={customRange?.end}
                      onSelect={(date) => {
                        if (date)
                          setCustomRange((prev) => ({
                            start: prev?.start || date,
                            end: date,
                          }));
                      }}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}

          {/* Exclude Adhoc toggle */}
          <div className="flex items-center justify-between">
            <Label htmlFor="exclude-adhoc" className="cursor-pointer text-sm">
              Exclude Adhoc Expenses
            </Label>
            <Switch id="exclude-adhoc" checked={excludeAdhoc} onCheckedChange={setExcludeAdhoc} />
          </div>
        </m.div>

        {/* Category Breakdown */}
        {summary.totalTransactions > 0 ? (
          <>
            {/* Summary Stats */}
            <m.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="grid grid-cols-2 lg:grid-cols-4 gap-3"
            >
              <div className="p-4 bg-card rounded-xl border border-border/50">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Wallet className="h-4 w-4" />
                  <span className="text-xs">Total</span>
                </div>
                <p className="text-xl font-bold">
                  {currency.symbol}
                  {formatValue(summary.totalExpenses)}
                </p>
              </div>

              <div className="p-4 bg-card rounded-xl border border-border/50">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Receipt className="h-4 w-4" />
                  <span className="text-xs">Transactions</span>
                </div>
                <p className="text-xl font-bold">{summary.totalTransactions}</p>
              </div>

              <div className="p-4 bg-card rounded-xl border border-border/50">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-xs">Average</span>
                </div>
                <p className="text-xl font-bold">
                  {currency.symbol}
                  {formatValue(Math.round(summary.averageExpense))}
                </p>
              </div>

              <div className="p-4 bg-card rounded-xl border border-border/50">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Award className="h-4 w-4" />
                  <span className="text-xs">Top Category</span>
                </div>
                {summary.topCategory ? (
                  <div className="flex items-center gap-2">
                    <CategoryIcon
                      icon={summary.topCategory.categoryIcon}
                      color={summary.topCategory.categoryColor}
                      size="sm"
                    />
                    <span className="font-medium text-sm truncate">
                      {summary.topCategory.categoryName}
                    </span>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No data</p>
                )}
              </div>
            </m.div>

            <m.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="p-4 bg-card rounded-xl border border-border/50"
            >
              <Suspense
                fallback={
                  <div className="h-64 rounded-lg bg-muted/40 animate-pulse" aria-hidden="true" />
                }
              >
                <CategoryBreakdown
                  pieData={pieData}
                  nonZeroCategories={nonZeroCategories}
                  currency={currency}
                  formatValue={formatValue}
                />
              </Suspense>
            </m.div>

            {/* Spending Trend */}
            <m.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="p-4 bg-card rounded-xl border border-border/50"
            >
              <Suspense
                fallback={
                  <div className="h-64 rounded-lg bg-muted/40 animate-pulse" aria-hidden="true" />
                }
              >
                <TrendSection
                  barData={barData}
                  currency={currency}
                  formatValue={formatValue}
                  trendGranularity={trendGranularity as TrendGranularity}
                  setTrendGranularity={(g) => setTrendGranularity(g)}
                  granularityOptions={granularityOptions as TrendGranularity[]}
                />
              </Suspense>
            </m.div>
          </>
        ) : (
          <m.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col items-center justify-center py-12 text-muted-foreground"
          >
            <p>No expense data for this period</p>
          </m.div>
        )}

        {/* Export Button */}
        <m.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Button variant="outline" className="w-full" onClick={() => setShowExportDialog(true)}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </m.div>

        {/* Export Dialog */}
        <ExportDialog
          open={showExportDialog}
          onOpenChange={setShowExportDialog}
          onExportCSV={handleExportCSV}
          onExportJSON={handleExportJSON}
        />
      </div>
    </LazyMotion>
  );
}
