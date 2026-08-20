import { cn } from "@/lib/utils";
import { commitOnEnter } from "@/lib/bulkAddDraft";
import type { RowFieldErrors } from "@/lib/bulkAddDraft";
import { TagChipList } from "@/components/expenses/TagChipList";
import { RowAmountCategory, RowFieldError } from "@/components/bulk-add/RowAmountCategory";
import { RowDescriptionField } from "@/components/bulk-add/RowDescriptionField";
import { RowTagsToggle } from "@/components/bulk-add/RowTagsToggle";
import { RowTimeToggle } from "@/components/bulk-add/RowTimeToggle";
import { RowAdhocToggle } from "@/components/bulk-add/RowAdhocToggle";
import type { BulkDraftBlock, BulkDraftRow } from "@/db/bulkDraft";
import type { Category } from "@/types/expense";

interface RowCardProps {
  block: BulkDraftBlock;
  row: BulkDraftRow;
  index: number;
  today: string;
  categories: Category[];
  currencySymbol: string;
  errors: RowFieldErrors | undefined;
  allDescriptions: string[];
  allTags: string[];
  onUpdate: (patch: Partial<BulkDraftRow>) => void;
  onRemove: () => void;
  onCommit: () => void;
  registerAmountRef: (el: HTMLInputElement | null) => void;
  registerRowRef: (el: HTMLDivElement | null) => void;
}

export function RowCard({
  block,
  row,
  index,
  today,
  categories,
  currencySymbol,
  errors,
  allDescriptions,
  allTags,
  onUpdate,
  onRemove,
  onCommit,
  registerAmountRef,
  registerRowRef,
}: RowCardProps) {
  return (
    <div
      data-testid="bulk-row"
      ref={registerRowRef}
      className={cn("space-y-1.5 -mx-3 px-3 py-3", index % 2 === 1 && "bg-muted/40")}
    >
      <RowAmountCategory
        row={row}
        categories={categories}
        currencySymbol={currencySymbol}
        errors={errors}
        onUpdate={onUpdate}
        onRemove={onRemove}
        onCommit={onCommit}
        registerAmountRef={registerAmountRef}
      />
      <RowDescriptionField
        value={row.description}
        allDescriptions={allDescriptions}
        onChange={(v) => onUpdate({ description: v })}
        onKeyDown={(e) => commitOnEnter(e, onCommit)}
      />
      <div className="flex items-center gap-1 text-xs text-muted-foreground flex-wrap">
        <RowTagsToggle row={row} allTags={allTags} onUpdate={onUpdate} />
        <RowTimeToggle block={block} row={row} today={today} onUpdate={onUpdate} />
        <RowAdhocToggle row={row} onUpdate={onUpdate} />
      </div>
      <TagChipList
        tags={row.tags}
        onRemoveTag={(t) => onUpdate({ tags: row.tags.filter((x) => x !== t) })}
      />
      <RowFieldError message={errors?.tags} />
    </div>
  );
}
