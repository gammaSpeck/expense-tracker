import { lazy, Suspense } from "react";
import { AnalysisSummary, CategorySummary } from "@/types/expense";
import { SummaryStatsGrid } from "@/components/analysis/SummaryStatsGrid";
import { TrendGranularity, PieDatum } from "@/components/analysis/analysisUtils";
import { useTrendGranularity } from "@/hooks/useTrendGranularity";
import { Currency } from "@/lib/currency";

const CategoryBreakdown = lazy(() => import("@/components/analysis/CategoryBreakdown"));
const TrendSection = lazy(() => import("@/components/analysis/TrendSection"));

const chartFallback = (
  <div className="h-64 rounded-lg bg-muted/40 animate-pulse" aria-hidden="true" />
);

interface AnalysisContentProps {
  summary: AnalysisSummary;
  pieData: PieDatum[];
  nonZeroCategories: CategorySummary[];
  currency: Currency;
  formatValue: (value: number) => string;
  granularity: ReturnType<typeof useTrendGranularity>;
}

export function AnalysisContent({
  summary,
  pieData,
  nonZeroCategories,
  currency,
  formatValue,
  granularity,
}: AnalysisContentProps) {
  return (
    <>
      <div
        className="animate-slide-in-up"
        style={{ animationDelay: "150ms", animationFillMode: "backwards" }}
      >
        <SummaryStatsGrid summary={summary} currency={currency} formatValue={formatValue} />
      </div>

      <div
        className="p-4 bg-card rounded-xl border border-border/50 animate-slide-in-up"
        style={{ animationDelay: "100ms", animationFillMode: "backwards" }}
      >
        <Suspense fallback={chartFallback}>
          <CategoryBreakdown
            pieData={pieData}
            nonZeroCategories={nonZeroCategories}
            currency={currency}
            formatValue={formatValue}
          />
        </Suspense>
      </div>

      <div
        className="p-4 bg-card rounded-xl border border-border/50 animate-slide-in-up"
        style={{ animationDelay: "200ms", animationFillMode: "backwards" }}
      >
        <Suspense fallback={chartFallback}>
          <TrendSection
            barData={granularity.barData}
            currency={currency}
            formatValue={formatValue}
            trendGranularity={granularity.trendGranularity as TrendGranularity}
            setTrendGranularity={(g) => granularity.setTrendGranularity(g)}
            granularityOptions={granularity.granularityOptions as TrendGranularity[]}
          />
        </Suspense>
      </div>
    </>
  );
}
