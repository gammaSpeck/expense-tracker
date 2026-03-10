import React from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TrendGranularity } from "./analysisUtils";
import type { Currency } from "@/lib/currency";

type DataPoint = { label: string; amount: number };

type Props = {
  barData: DataPoint[];
  currency: Currency;
  formatValue: (v: number) => string;
  trendGranularity: TrendGranularity;
  setTrendGranularity: (g: TrendGranularity) => void;
  granularityOptions: TrendGranularity[];
};

export default function TrendSection({
  barData,
  currency,
  formatValue,
  trendGranularity,
  setTrendGranularity,
  granularityOptions,
}: Props) {
  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium">Spending Trend</h3>
        {granularityOptions.length > 1 && (
          <Select
            value={trendGranularity}
            onValueChange={(v) => setTrendGranularity(v as TrendGranularity)}
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
              formatter={(value: number) => [`${currency.symbol}${formatValue(value)}`, "Amount"]}
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
    </>
  );
}
