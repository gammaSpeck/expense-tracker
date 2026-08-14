import { Award, Receipt, TrendingUp, Wallet } from "lucide-react";
import { CategoryIcon } from "@/components/categories/CategoryIcon";
import { AnalysisSummary } from "@/types/expense";
import type { Currency } from "@/lib/currency";

interface SummaryStatsGridProps {
  summary: AnalysisSummary;
  currency: Currency;
  formatValue: (value: number) => string;
}

export function SummaryStatsGrid({ summary, currency, formatValue }: SummaryStatsGridProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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
            <span className="font-medium text-sm truncate">{summary.topCategory.categoryName}</span>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No data</p>
        )}
      </div>
    </div>
  );
}
