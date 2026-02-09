import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import {
  format,
  parseISO,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subWeeks,
  subMonths,
  subYears,
  addWeeks,
  addMonths,
  addYears,
  differenceInDays,
  isSameMonth,
  getWeek,
} from "date-fns";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
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
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CategoryIcon } from "@/components/categories/CategoryIcon";
import { cn } from "@/lib/utils";
import {
  useAnalysisSummary,
  useCategories,
  getDateRangeForPeriod,
} from "@/hooks/useExpenseData";
import { exportAllData } from "@/lib/db";
import {
  TimePeriod,
  ExpenseFilters,
  DateRange,
  DailySummary,
} from "@/types/expense";
import { toast } from "sonner";
import { useCurrency } from "@/contexts/CurrencyContext";

type TrendGranularity = "day" | "week" | "month";

// Custom tooltip for pie chart
const CustomPieTooltip = ({ active, payload }: any) => {
  const { currency } = useCurrency();

  if (!active || !payload || !payload?.length) return null;

  const data = payload[0];
  const percentage = ((data.value / data.payload.total) * 100).toFixed(1);
  return (
    <div
      className="px-3 py-2 rounded-lg shadow-lg border border-white"
      style={{
        backgroundColor: data.payload.color,
      }}
    >
      <p className="font-medium text-white">{data.name}</p>
      <p className="text-white/90">
        {currency.symbol}
        {data.value.toLocaleString(currency.locale)}
      </p>
      <p className="text-white/80 text-sm">{percentage}%</p>
    </div>
  );
};

// --- Helper functions ---

function formatPeriodDisplay(
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

function getGranularityOptions(
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

function aggregateTrendData(
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
    const weekMap = new Map<string, number>();
    for (const d of dailyData) {
      const date = parseISO(d.date);
      const weekStart = startOfWeek(date, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
      const key = format(weekStart, "yyyy-MM-dd");
      const label = isSameMonth(weekStart, weekEnd)
        ? `${format(weekStart, "MMM d")}-${format(weekEnd, "d")}`
        : `${format(weekStart, "MMM d")}-${format(weekEnd, "MMM d")}`;
      weekMap.set(key, (weekMap.get(key) || 0) + d.total);
      // Store label as well
      if (!weekMap.has(`label_${key}`)) {
        weekMap.set(`label_${key}`, 0);
      }
    }

    // Rebuild properly
    const weeks = new Map<string, { label: string; amount: number }>();
    for (const d of dailyData) {
      const date = parseISO(d.date);
      const weekStart = startOfWeek(date, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
      const key = format(weekStart, "yyyy-MM-dd");
      if (!weeks.has(key)) {
        const label = isSameMonth(weekStart, weekEnd)
          ? `${format(weekStart, "MMM d")}-${format(weekEnd, "d")}`
          : `${format(weekStart, "MMM d")}-${format(weekEnd, "MMM d")}`;
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

// --- Component ---

export default function AnalysisPage() {
  const [periodTab, setPeriodTab] = useState<TimePeriod>("month");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [customRange, setCustomRange] = useState<DateRange | undefined>();
  const [excludeAdhoc, setExcludeAdhoc] = useState(true);
  const [trendGranularity, setTrendGranularity] =
    useState<TrendGranularity>("day");
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
    return getDateRangeForPeriod(
      periodTab as "week" | "month" | "year",
      selectedDate,
    );
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
  const nonZeroCategories = summary.categoryBreakdown.filter(
    (cat) => cat.total > 0,
  );

  const totalForPie = nonZeroCategories.reduce(
    (sum, cat) => sum + cat.total,
    0,
  );

  const pieData = nonZeroCategories.map((cat) => ({
    name: cat.categoryName,
    value: cat.total,
    color: cat.categoryColor,
    total: totalForPie,
    percentage:
      totalForPie > 0 ? ((cat.total / totalForPie) * 100).toFixed(1) : "0",
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
        [
          "Date",
          "Time",
          "Category",
          "Description",
          "Value",
          "Tags",
          "IsAdhoc",
        ].join(","),
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
    } catch (error) {
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
    } catch (error) {
      toast.error("Export failed");
    }
  };

  return (
    <div className="px-4 py-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-xl font-semibold">Analysis</h1>
      </motion.div>

      {/* Period Selector */}
      <motion.div
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
                    {customRange?.start
                      ? format(customRange.start, "PP")
                      : "Pick start"}
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
                    autoFocus
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
                    {customRange?.end
                      ? format(customRange.end, "PP")
                      : "Pick end"}
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
                    autoFocus
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
          <Switch
            id="exclude-adhoc"
            checked={excludeAdhoc}
            onCheckedChange={setExcludeAdhoc}
          />
        </div>
      </motion.div>

      {/* Category Breakdown */}
      {summary.totalTransactions > 0 ? (
        <>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-4 bg-card rounded-xl border border-border/50"
          >
            <h3 className="text-sm font-medium mb-4">Category Breakdown</h3>
            <div className="h-64 **:outline-none">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ payload }) => `${payload.percentage}%`}
                    labelLine={false}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Legend - ALL non-zero categories */}
            <div className="mt-4 space-y-2 lg:grid lg:grid-cols-2 lg:gap-x-4 lg:gap-y-2 lg:space-y-0">
              {nonZeroCategories.map((cat) => (
                <div
                  key={cat.categoryId}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <CategoryIcon
                      icon={cat.categoryIcon}
                      color={cat.categoryColor}
                      size="sm"
                    />
                    <span className="truncate">{cat.categoryName}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-2">
                    <span className="font-medium">
                      {currency.symbol}
                      {formatValue(cat.total)}
                    </span>
                    <span className="text-muted-foreground w-12 text-right">
                      {cat.percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Summary Stats */}
          <motion.div
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
          </motion.div>

          {/* Spending Trend */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-4 bg-card rounded-xl border border-border/50"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium">Spending Trend</h3>
              {granularityOptions.length > 1 && (
                <Select
                  value={trendGranularity}
                  onValueChange={(v) =>
                    setTrendGranularity(v as TrendGranularity)
                  }
                >
                  <SelectTrigger className="w-24 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {granularityOptions.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt.charAt(0).toUpperCase() + opt.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="h-64 **:outline-none">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fontSize: 10,
                      fill: "hsl(var(--muted-foreground))",
                    }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fontSize: 10,
                      fill: "hsl(var(--muted-foreground))",
                    }}
                    tickFormatter={(value) =>
                      `${currency.symbol}${value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}`
                    }
                  />
                  <Tooltip
                    formatter={(value: number) => [
                      `${currency.symbol}${formatValue(value)}`,
                      "Amount",
                    ]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "0.5rem",
                    }}
                  />
                  <Bar
                    dataKey="amount"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col items-center justify-center py-12 text-muted-foreground"
        >
          <p>No expense data for this period</p>
        </motion.div>
      )}

      {/* Export Button */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setShowExportDialog(true)}
        >
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </motion.div>

      {/* Export Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Data</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <Button
              variant="outline"
              className="w-full justify-start h-auto py-4"
              onClick={handleExportCSV}
            >
              <div className="text-left">
                <p className="font-medium">Export as CSV</p>
                <p className="text-xs text-muted-foreground">
                  Compatible with Excel, Google Sheets
                </p>
              </div>
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start h-auto py-4"
              onClick={handleExportJSON}
            >
              <div className="text-left">
                <p className="font-medium">Export as JSON</p>
                <p className="text-xs text-muted-foreground">
                  Full data backup with all fields
                </p>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
