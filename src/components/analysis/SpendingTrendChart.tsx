import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import type { Currency } from "@/lib/currency";

type DataPoint = { label: string; amount: number };

interface SpendingTrendChartProps {
  barData: DataPoint[];
  currency: Currency;
  formatValue: (v: number) => string;
}

export function SpendingTrendChart({ barData, currency, formatValue }: SpendingTrendChartProps) {
  return (
    <div className="h-64 **:outline-none" data-testid="spending-trend-chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={barData}>
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            tickFormatter={(value) =>
              `${currency.symbol}${value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}`
            }
          />
          <Tooltip
            formatter={(value) => [`${currency.symbol}${formatValue(Number(value))}`, "Amount"]}
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "0.5rem",
            }}
          />
          <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
