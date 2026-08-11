import { format } from "date-fns";

interface MonthlySummaryCardProps {
  total: number;
  totalExcludingAdhoc: number;
  monthStart: Date;
  monthEnd: Date;
  currencySymbol: string;
  formatValue: (value: number) => string;
}

export function MonthlySummaryCard({
  total,
  totalExcludingAdhoc,
  monthStart,
  monthEnd,
  currencySymbol,
  formatValue,
}: MonthlySummaryCardProps) {
  return (
    <div className="summary-card animate-slide-in-up">
      <p className="text-sm opacity-80">This Month's Expenses</p>
      <p className="text-3xl font-bold mt-1">
        {currencySymbol}
        {formatValue(total)}
      </p>
      {totalExcludingAdhoc !== total && (
        <p className="text-sm opacity-70 mt-1">
          Excluding Adhoc: {currencySymbol}
          {formatValue(totalExcludingAdhoc)}
        </p>
      )}
      <p className="text-xs opacity-60 mt-2">
        {format(monthStart, "d MMM")} - {format(monthEnd, "d MMM yyyy")}
      </p>
    </div>
  );
}
