import type { TrendGranularity } from "./analysisUtils";
import type { Currency } from "@/lib/currency";
import { TrendGranularitySelect } from "./TrendGranularitySelect";
import { SpendingTrendChart } from "./SpendingTrendChart";

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
        <TrendGranularitySelect
          trendGranularity={trendGranularity}
          setTrendGranularity={setTrendGranularity}
          granularityOptions={granularityOptions}
        />
      </div>
      <SpendingTrendChart barData={barData} currency={currency} formatValue={formatValue} />
    </>
  );
}
