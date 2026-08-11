import { PeriodSelector } from "@/components/analysis/PeriodSelector";
import { AnalysisContent } from "@/components/analysis/AnalysisContent";
import { AnalysisExportSection } from "@/components/analysis/AnalysisExportSection";
import { useAnalysisPageState } from "@/hooks/useAnalysisPageState";

export default function AnalysisPage() {
  const state = useAnalysisPageState();

  return (
    <div className="px-4 py-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="animate-slide-in-up">
        <h1 className="text-xl font-semibold">Analysis</h1>
      </div>

      {/* Period Selector */}
      <PeriodSelector
        periodTab={state.periodTab}
        onPeriodChange={state.handlePeriodChange}
        periodDisplay={state.period.periodDisplay}
        goToPreviousPeriod={state.period.goToPreviousPeriod}
        goToNextPeriod={state.period.goToNextPeriod}
        customRange={state.customRange}
        setCustomRange={state.period.setCustomRange}
        excludeAdhoc={state.excludeAdhoc}
        setExcludeAdhoc={state.setExcludeAdhoc}
      />

      {state.summary.totalTransactions > 0 ? (
        <AnalysisContent
          summary={state.summary}
          pieData={state.pieData}
          nonZeroCategories={state.nonZeroCategories}
          currency={state.currency}
          formatValue={state.formatValue}
          granularity={state.granularity}
        />
      ) : (
        <div
          className="flex flex-col items-center justify-center py-12 text-muted-foreground animate-slide-in-up"
          style={{ animationDelay: "100ms", animationFillMode: "backwards" }}
        >
          <p>No expense data for this period</p>
        </div>
      )}

      <AnalysisExportSection
        showExportDialog={state.showExportDialog}
        setShowExportDialog={state.setShowExportDialog}
        onExportCSV={state.handleExportCSV}
        onExportJSON={state.handleExportJSON}
      />
    </div>
  );
}
