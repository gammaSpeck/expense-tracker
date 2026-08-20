import { useState } from "react";
import { format, parseISO } from "date-fns";
import { Calendar, ChevronDown, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { blockTotals, entryLabel } from "@/lib/bulkAddDraft";
import type { RowFieldErrors } from "@/lib/bulkAddDraft";
import { RowCard } from "@/components/bulk-add/RowCard";
import type { BulkDraftBlock, BulkDraftRow } from "@/db/bulkDraft";
import type { Category } from "@/types/expense";

function DateOption({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-accent"
    >
      {label}
    </button>
  );
}

interface BlockDateControlProps {
  block: BulkDraftBlock;
  today: string;
  yesterday: string;
  onSetDate: (date: string) => void;
}

function BlockDateControl({ block, today, yesterday, onSetDate }: BlockDateControlProps) {
  const [open, setOpen] = useState(false);
  const label =
    block.date === today
      ? "Today"
      : block.date === yesterday
        ? "Yesterday"
        : format(parseISO(block.date), "d MMM");

  const choose = (date: string) => {
    onSetDate(date);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="px-2.5 py-1 rounded-full text-xs font-medium bg-primary text-primary-foreground flex items-center gap-1 shrink-0"
        >
          <Calendar className="h-3 w-3" />
          {label}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-40 p-1" align="start">
        <DateOption label="Today" onClick={() => choose(today)} />
        <DateOption label="Yesterday" onClick={() => choose(yesterday)} />
        <input
          type="date"
          aria-label="Custom date"
          value={block.date}
          onChange={(e) => choose(e.target.value)}
          className="w-full h-8 text-xs border border-input rounded-md px-2 bg-background mt-1"
        />
      </PopoverContent>
    </Popover>
  );
}

interface BlockHeaderProps {
  block: BulkDraftBlock;
  today: string;
  yesterday: string;
  count: number;
  total: number;
  formatValue: (value: number) => string;
  onToggleCollapse: () => void;
  onSetDate: (date: string) => void;
  onRemoveBlock: () => void;
}

function BlockHeader({
  block,
  today,
  yesterday,
  count,
  total,
  formatValue,
  onToggleCollapse,
  onSetDate,
  onRemoveBlock,
}: BlockHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 p-3 bg-muted/30 flex-wrap",
        block.collapsed ? "rounded-xl" : "rounded-t-xl",
      )}
    >
      <button
        type="button"
        aria-label={block.collapsed ? "Expand day" : "Collapse day"}
        onClick={onToggleCollapse}
        className="shrink-0 text-muted-foreground hover:text-foreground"
      >
        <ChevronDown
          className={cn("h-4 w-4 transition-transform", block.collapsed && "-rotate-90")}
        />
      </button>
      <BlockDateControl block={block} today={today} yesterday={yesterday} onSetDate={onSetDate} />
      <span className="ml-auto text-xs text-muted-foreground whitespace-nowrap">
        {count} {entryLabel(count)} · {formatValue(total)}
      </span>
      <button
        type="button"
        aria-label="Remove day"
        onClick={onRemoveBlock}
        className="p-1 text-muted-foreground hover:text-foreground shrink-0"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

interface BlockBodyProps {
  block: BulkDraftBlock;
  today: string;
  categories: Category[];
  currencySymbol: string;
  errors: Map<string, RowFieldErrors>;
  allDescriptions: string[];
  allTags: string[];
  onAddRow: () => void;
  onUpdateRow: (rowId: string, patch: Partial<BulkDraftRow>) => void;
  onRemoveRow: (rowId: string) => void;
  registerAmountRef: (rowId: string, el: HTMLInputElement | null) => void;
  registerRowRef: (rowId: string, el: HTMLDivElement | null) => void;
}

function BlockBody({
  block,
  today,
  categories,
  currencySymbol,
  errors,
  allDescriptions,
  allTags,
  onAddRow,
  onUpdateRow,
  onRemoveRow,
  registerAmountRef,
  registerRowRef,
}: BlockBodyProps) {
  if (block.collapsed) return null;

  return (
    <div className="p-3 space-y-3">
      {block.rows.map((row, index) => (
        <RowCard
          key={row.id}
          block={block}
          row={row}
          index={index}
          today={today}
          categories={categories}
          currencySymbol={currencySymbol}
          errors={errors.get(row.id)}
          allDescriptions={allDescriptions}
          allTags={allTags}
          onUpdate={(patch) => onUpdateRow(row.id, patch)}
          onRemove={() => onRemoveRow(row.id)}
          onCommit={onAddRow}
          registerAmountRef={(el) => registerAmountRef(row.id, el)}
          registerRowRef={(el) => registerRowRef(row.id, el)}
        />
      ))}
      <Button type="button" variant="ghost" size="sm" onClick={onAddRow}>
        + Add transaction
      </Button>
    </div>
  );
}

interface BlockCardProps extends BlockBodyProps {
  yesterday: string;
  formatValue: (value: number) => string;
  onToggleCollapse: () => void;
  onSetDate: (date: string) => void;
  onRemoveBlock: () => void;
}

export function BlockCard({
  yesterday,
  formatValue,
  onToggleCollapse,
  onSetDate,
  onRemoveBlock,
  ...bodyProps
}: BlockCardProps) {
  const { count, total } = blockTotals(bodyProps.block);

  return (
    <div data-testid="bulk-block" className="rounded-xl border border-border">
      <BlockHeader
        block={bodyProps.block}
        today={bodyProps.today}
        yesterday={yesterday}
        count={count}
        total={total}
        formatValue={formatValue}
        onToggleCollapse={onToggleCollapse}
        onSetDate={onSetDate}
        onRemoveBlock={onRemoveBlock}
      />
      <BlockBody {...bodyProps} />
    </div>
  );
}
