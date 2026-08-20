import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBulkAddController } from "@/hooks/useBulkAddController";
import { DraftResumeDialog } from "@/components/bulk-add/DraftResumeDialog";
import { BlockCard } from "@/components/bulk-add/BlockCard";
import { ScaleHint, BulkFooter } from "@/components/bulk-add/BulkFooter";

export default function BulkAddPage() {
  const bulk = useBulkAddController();

  return (
    <div className="px-4 py-6 pb-44 lg:pb-28 max-w-2xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Go back"
          onClick={bulk.handleBack}
          className="h-9 w-9"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-semibold">Add many</h1>
      </div>

      <DraftResumeDialog
        pendingDraft={bulk.pendingDraft}
        onResume={bulk.resumeDraft}
        onDiscard={bulk.discardDraft}
      />

      {bulk.blocks.map((block) => (
        <BlockCard
          key={block.id}
          block={block}
          today={bulk.today}
          yesterday={bulk.yesterday}
          categories={bulk.categories}
          currencySymbol={bulk.currency.symbol}
          allDescriptions={bulk.allDescriptions}
          allTags={bulk.allTags}
          formatValue={bulk.formatValue}
          errors={bulk.rowErrors}
          onSetDate={(date) => bulk.handleSetDate(block.id, date)}
          onToggleCollapse={() => bulk.handleToggleCollapse(block.id)}
          onRemoveBlock={() => bulk.handleRemoveBlock(block.id)}
          onAddRow={() => bulk.handleAddRow(block.id)}
          onUpdateRow={(rowId, patch) => bulk.handleUpdateRow(block.id, rowId, patch)}
          onRemoveRow={(rowId) => bulk.handleRemoveRow(block.id, rowId)}
          registerAmountRef={bulk.registerAmountRef}
          registerRowRef={bulk.registerRowRef}
        />
      ))}

      <Button type="button" variant="outline" className="w-full" onClick={bulk.handleAddBlock}>
        + Add another day
      </Button>

      <ScaleHint totalRowCount={bulk.totalRowCount} />

      <BulkFooter
        entryCount={bulk.entryCount}
        grandTotal={bulk.grandTotal}
        formatValue={bulk.formatValue}
        onSave={() => void bulk.handleSave()}
        disabled={bulk.entryCount === 0 || bulk.saving}
      />
    </div>
  );
}
