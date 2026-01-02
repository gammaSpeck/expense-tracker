import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { format, parseISO } from "date-fns";
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
  Legend,
} from "recharts";
import { Download, TrendingUp, Wallet, Receipt, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CategoryIcon } from "@/components/categories/CategoryIcon";
import {
  useAnalysisSummary,
  useCategories,
  getDateRangeForPeriod,
} from "@/hooks/useExpenseData";
import { exportAllData } from "@/lib/db";
import { TimePeriod, ExpenseFilters, DateRange } from "@/types/expense";
import { toast } from "sonner";
import { useCurrency } from "@/contexts/CurrencyContext";

// Custom tooltip for pie chart
const CustomPieTooltip = ({ active, payload }: any) => {
  const { currency } = useCurrency();

  if (!active || !payload || !payload?.length) return null;

  const data = payload[0];
  const percentage = ((data.value / data.payload.total) * 100).toFixed(1);
  return (
    <div
      className="px-3 py-2 rounded-lg shadow-lg border"
      style={{
        backgroundColor: data.payload.color,
        borderColor: data.payload.color,
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

export default function AnalysisPage() {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("month");
  const [customRange, setCustomRange] = useState<DateRange | undefined>();
  const [excludeAdhoc, setExcludeAdhoc] = useState(true);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const categories = useCategories();

  const dateRange = useMemo(() => {
    if (timePeriod === "custom" && customRange) {
      return customRange;
    }
    if (timePeriod === "custom") {
      return getDateRangeForPeriod("month");
    }
    return getDateRangeForPeriod(timePeriod);
  }, [timePeriod, customRange]);

  const filters: ExpenseFilters = {
    dateRange,
    includeAdhoc: !excludeAdhoc,
  };

  const summary = useAnalysisSummary(filters);
  const { currency, formatValue } = useCurrency();

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

      const exportData = {
        exportDate: new Date().toISOString(),
        ...data,
      };

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

  const totalForPie = summary.categoryBreakdown.reduce(
    (sum, cat) => sum + cat.total,
    0
  );

  const pieData = summary.categoryBreakdown.map((cat) => ({
    name: cat.categoryName,
    value: cat.total,
    color: cat.categoryColor,
    total: totalForPie,
    percentage:
      totalForPie > 0 ? ((cat.total / totalForPie) * 100).toFixed(1) : "0",
  }));

  const barData = summary.dailyTrend.map((day) => ({
    date: format(new Date(day.date), "MMM d"),
    amount: day.total,
  }));

  return (
    <div className="px-4 py-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <h1 className="text-xl font-semibold">Analysis</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowExportDialog(true)}
        >
          <Download className="h-4 w-4 mr-1" />
          Export
        </Button>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="space-y-4 p-4 bg-card rounded-xl border border-border/50"
      >
        <Tabs
          value={timePeriod}
          onValueChange={(v) => setTimePeriod(v as TimePeriod)}
        >
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

        {timePeriod === "custom" && (
          <div className="flex gap-2">
            <Input
              type="date"
              value={
                customRange?.start
                  ? format(customRange.start, "yyyy-MM-dd")
                  : ""
              }
              onChange={(e) => {
                const date = e.target.value
                  ? parseISO(e.target.value)
                  : undefined;
                if (date)
                  setCustomRange((prev) => ({
                    start: date,
                    end: prev?.end || date,
                  }));
              }}
              className="flex-1"
            />
            <Input
              type="date"
              value={
                customRange?.end ? format(customRange.end, "yyyy-MM-dd") : ""
              }
              onChange={(e) => {
                const date = e.target.value
                  ? parseISO(e.target.value)
                  : undefined;
                if (date)
                  setCustomRange((prev) => ({
                    start: prev?.start || date,
                    end: date,
                  }));
              }}
              className="flex-1"
            />
          </div>
        )}

        <div className="flex items-center justify-between">
          <Label htmlFor="exclude-adhoc" className="cursor-pointer">
            Exclude Adhoc Expenses
          </Label>
          <Switch
            id="exclude-adhoc"
            checked={excludeAdhoc}
            onCheckedChange={setExcludeAdhoc}
          />
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          <span className="px-2 py-1 bg-muted rounded-full">
            {format(dateRange.start, "d MMM")} -{" "}
            {format(dateRange.end, "d MMM yyyy")}
          </span>
          {excludeAdhoc && (
            <span className="px-2 py-1 bg-primary/10 text-primary rounded-full">
              Excluding Adhoc
            </span>
          )}
        </div>
      </motion.div>

      {/* Summary Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
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

      {/* Charts */}
      {summary.totalTransactions > 0 ? (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Pie Chart */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="p-4 bg-card rounded-xl border border-border/50"
          >
            <h3 className="text-sm font-medium mb-4">Category Breakdown</h3>
            <div className="h-64">
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

            {/* Legend */}
            <div className="mt-4 space-y-2">
              {summary.categoryBreakdown.slice(0, 5).map((cat) => (
                <div
                  key={cat.categoryId}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: cat.categoryColor }}
                    />
                    <span className="truncate">{cat.categoryName}</span>
                  </div>
                  <div className="flex items-center gap-3">
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

          {/* Bar Chart */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-4 bg-card rounded-xl border border-border/50"
          >
            <h3 className="text-sm font-medium mb-4">Spending Trend</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <XAxis
                    dataKey="date"
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
                      `${currency.symbol}${(value / 1000).toFixed(0)}k`
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
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="flex flex-col items-center justify-center py-12 text-muted-foreground"
        >
          <p>No expense data for this period</p>
        </motion.div>
      )}

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
