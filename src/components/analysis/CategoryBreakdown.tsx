import React from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import CustomPieTooltip from "./CustomPieTooltip";
import { CategoryIcon } from "@/components/categories/CategoryIcon";
import type { CategorySummary } from "@/types/expense";
import type { Currency } from "@/lib/currency";

type PieDatum = {
  name: string;
  value: number;
  color: string;
  total: number;
  percentage: string;
};

type Props = {
  pieData: PieDatum[];
  nonZeroCategories: CategorySummary[];
  currency: Currency;
  formatValue: (v: number) => string;
};

export default function CategoryBreakdown({
  pieData,
  nonZeroCategories,
  currency,
  formatValue,
}: Props) {
  return (
    <>
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
              {pieData.map((entry) => (
                <Cell key={`${entry.name}-${entry.color}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomPieTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend - ALL non-zero categories */}
      <div className="mt-4 space-y-2 lg:grid lg:grid-cols-2 lg:gap-x-4 lg:gap-y-2 lg:space-y-0">
        {nonZeroCategories.map((cat) => (
          <div key={cat.categoryId} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 min-w-0">
              <CategoryIcon icon={cat.categoryIcon} color={cat.categoryColor} size="sm" />
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
    </>
  );
}
