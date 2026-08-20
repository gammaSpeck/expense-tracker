import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBulkAddController } from "@/hooks/useBulkAddController";
import { DraftResumeDialog } from "@/components/bulk-add/DraftResumeDialog";
import { BlockCard } from "@/components/bulk-add/BlockCard";
import { ScaleHint, BulkFooter } from "@/components/bulk-add/BulkFooter";

export default function BulkAddPage() {
  const {
    categories,
    currency,
    formatValue,
    today,
    yesterday,
    blocks,
    rowErrors,
    saving,
    pendingDraft,
    allDescriptions,
    allTags,
    totalRowCount,
    entryCount,
    grandTotal,
    resumeDraft,
    discardDraft,
    handleUpdateRow,
    handleAddRow,
    handleRemoveRow,
    handleAddBlock,
    handleRemoveBlock,
    handleToggleCollapse,
    handleSetDate,
    handleBack,
    handleSave,
    registerAmountRef,
    registerRowRef,
  } = useBulkAddController();

  return (
    <div className="px-4 py-6 pb-44 lg:pb-28 max-w-2xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Go back"
          onClick={handleBack}
          className="h-9 w-9"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-semibold">Add many</h1>
      </div>

      <DraftResumeDialog
        pendingDraft={pendingDraft}
        onResume={resumeDraft}
        onDiscard={discardDraft}
      />

      {blocks.map((block) => (
        <BlockCard
          key={block.id}
          block={block}
          today={today}
          yesterday={yesterday}
          categories={categories}
          currencySymbol={currency.symbol}
          allDescriptions={allDescriptions}
          allTags={allTags}
          formatValue={formatValue}
          errors={rowErrors}
          onSetDate={(date) => handleSetDate(block.id, date)}
          onToggleCollapse={() => handleToggleCollapse(block.id)}
          onRemoveBlock={() => handleRemoveBlock(block.id)}
          onAddRow={() => handleAddRow(block.id)}
          onUpdateRow={(rowId, patch) => handleUpdateRow(block.id, rowId, patch)}
          onRemoveRow={(rowId) => handleRemoveRow(block.id, rowId)}
          registerAmountRef={registerAmountRef}
          registerRowRef={registerRowRef}
        />
      ))}

      <Button type="button" variant="outline" className="w-full" onClick={handleAddBlock}>
        + Add another day
      </Button>

      <ScaleHint totalRowCount={totalRowCount} />

      <BulkFooter
        entryCount={entryCount}
        grandTotal={grandTotal}
        formatValue={formatValue}
        onSave={() => void handleSave()}
        disabled={entryCount === 0 || saving}
      />
    </div>
  );
}
