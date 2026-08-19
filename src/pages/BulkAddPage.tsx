import { useEffect, useRef, useState } from "react";
import type { Dispatch, KeyboardEvent, SetStateAction } from "react";
import { useNavigate, Link } from "react-router";
import { format, subDays } from "date-fns";
import { ArrowLeft, ChevronDown, Clock, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectTrigger } from "@/components/ui/select";
import { CategorySelectValue, CategoryOptionItems } from "@/components/categories/CategorySelectOptions";
import { TagChipList } from "@/components/expenses/TagChipList";
import { useCategories } from "@/hooks/useExpenseData";
import { useCurrency } from "@/contexts/CurrencyContext";
import { getCurrentTime24 } from "@/lib/time";
import { getDateGroupLabel } from "@/lib/expenseDates";
import { addExpensesBulk } from "@/db/expenseTrackerDb";
import { getBulkDraft, saveBulkDraft, clearBulkDraft } from "@/db/bulkDraft";
import type { BulkDraft, BulkDraftBlock, BulkDraftRow } from "@/db/bulkDraft";
import type { Category, Expense } from "@/types/expense";
import { cn } from "@/lib/utils";

const SCALE_HINT_THRESHOLD = 100;
const DRAFT_DEBOUNCE_MS = 500;

type RowFieldErrors = { amount?: string; category?: string; tags?: string };
type ExpenseDraft = Omit<Expense, "id" | "createdAt" | "updatedAt">;

// ---------------------------------------------------------------------------
// Pure helpers — row/block shape, validation, and the blocks[] state reducers.
// Kept outside the component and split narrowly so each stays cheap to reason
// about (and cheap for static analysis) on its own.
// ---------------------------------------------------------------------------

function isRowBlank(row: BulkDraftRow): boolean {
  return row.value.trim() === "" && row.description.trim() === "" && row.tags.length === 0;
}

function blockHasContent(block: BulkDraftBlock): boolean {
  return block.rows.some((r) => !isRowBlank(r));
}

function makeRow(category: string): BulkDraftRow {
  return { id: crypto.randomUUID(), value: "", category, description: "", tags: [], time: null, isAdhoc: false };
}

function makeBlock(date: string, category: string): BulkDraftBlock {
  return { id: crypto.randomUUID(), date, collapsed: false, rows: [makeRow(category)] };
}

function blockTotals(block: BulkDraftBlock): { count: number; total: number } {
  const nonBlank = block.rows.filter((r) => !isRowBlank(r));
  return { count: nonBlank.length, total: nonBlank.reduce((sum, r) => sum + (Number(r.value) || 0), 0) };
}

function pageTotals(blocks: BulkDraftBlock[]): { count: number; total: number } {
  return blocks.reduce(
    (acc, b) => {
      const t = blockTotals(b);
      return { count: acc.count + t.count, total: acc.total + t.total };
    },
    { count: 0, total: 0 },
  );
}

function resolveTime(block: BulkDraftBlock, row: BulkDraftRow, today: string): string {
  return row.time ?? (block.date === today ? getCurrentTime24() : "12:00");
}

function amountFormatError(trimmedValue: string): string | undefined {
  if (trimmedValue === "") return "Amount is required";
  if (Number.isNaN(Number(trimmedValue))) return "Amount is required";
  return undefined;
}

function amountRangeError(amount: number): string | undefined {
  if (amount <= 0) return "Must be positive";
  if (amount > 10_000_000) return "Maximum 10,000,000";
  return undefined;
}

function amountError(trimmedValue: string): string | undefined {
  return amountFormatError(trimmedValue) ?? amountRangeError(Number(trimmedValue));
}

function validateRow(row: BulkDraftRow): RowFieldErrors {
  return {
    amount: amountError(row.value.trim()),
    category: row.category === "" ? "Category required" : undefined,
    tags: row.tags.length > 4 ? "Maximum 4 tags" : undefined,
  };
}

function rowHasErrors(errors: RowFieldErrors): boolean {
  return !!(errors.amount || errors.category || errors.tags);
}

function canAddTag(tags: string[], value: string): boolean {
  return value !== "" && tags.length < 4 && !tags.includes(value);
}

function buildExpenseDraft(block: BulkDraftBlock, row: BulkDraftRow, today: string): ExpenseDraft {
  return {
    value: Number(row.value),
    category: row.category,
    description: row.description.trim() || undefined,
    tags: row.tags,
    date: block.date,
    time: resolveTime(block, row, today),
    isAdhoc: row.isAdhoc,
  };
}

function flattenRows(blocks: BulkDraftBlock[]): { block: BulkDraftBlock; row: BulkDraftRow }[] {
  return blocks.flatMap((block) => block.rows.map((row) => ({ block, row })));
}

interface InvalidRow {
  blockId: string;
  errors: RowFieldErrors;
}

interface PartitionResult {
  toWrite: ExpenseDraft[];
  invalidRows: Map<string, InvalidRow>;
}

/** Splits every row into a write-ready draft or a validation failure. Blank rows are
 *  silently dropped (neither list). */
function partitionRows(blocks: BulkDraftBlock[], today: string): PartitionResult {
  const toWrite: ExpenseDraft[] = [];
  const invalidRows = new Map<string, InvalidRow>();

  for (const { block, row } of flattenRows(blocks)) {
    if (isRowBlank(row)) continue;
    const errors = validateRow(row);
    if (rowHasErrors(errors)) invalidRows.set(row.id, { blockId: block.id, errors });
    else toWrite.push(buildExpenseDraft(block, row, today));
  }

  return { toWrite, invalidRows };
}

function firstInvalidEntry(invalidRows: Map<string, InvalidRow>): { rowId: string; blockId: string } | null {
  const first = invalidRows.entries().next();
  return first.done ? null : { rowId: first.value[0], blockId: first.value[1].blockId };
}

function toErrorMap(invalidRows: Map<string, InvalidRow>): Map<string, RowFieldErrors> {
  return new Map(Array.from(invalidRows, ([id, v]) => [id, v.errors]));
}

function draftHasContent(draft: BulkDraft): boolean {
  return draft.blocks.some(blockHasContent);
}

// blocks[] reducers — each takes the prior state and returns the next, so every handler in
// the component is a one-line `setBlocks(bs => ...)` call.

function updateRow(rows: BulkDraftRow[], rowId: string, patch: Partial<BulkDraftRow>): BulkDraftRow[] {
  return rows.map((r) => (r.id !== rowId ? r : { ...r, ...patch }));
}

function updateBlockRow(
  blocks: BulkDraftBlock[],
  blockId: string,
  rowId: string,
  patch: Partial<BulkDraftRow>,
): BulkDraftBlock[] {
  return blocks.map((b) => (b.id !== blockId ? b : { ...b, rows: updateRow(b.rows, rowId, patch) }));
}

function addRowToBlock(blocks: BulkDraftBlock[], blockId: string, row: BulkDraftRow): BulkDraftBlock[] {
  return blocks.map((b) => (b.id === blockId ? { ...b, rows: [...b.rows, row] } : b));
}

function removeRowFromBlock(
  blocks: BulkDraftBlock[],
  blockId: string,
  rowId: string,
  fallbackCategory: string,
): BulkDraftBlock[] {
  return blocks.map((b) => {
    if (b.id !== blockId) return b;
    const rows = b.rows.filter((r) => r.id !== rowId);
    return { ...b, rows: rows.length > 0 ? rows : [makeRow(fallbackCategory)] };
  });
}

function removeBlock(blocks: BulkDraftBlock[], blockId: string): BulkDraftBlock[] {
  return blocks.filter((b) => b.id !== blockId);
}

function toggleBlockCollapse(blocks: BulkDraftBlock[], blockId: string): BulkDraftBlock[] {
  return blocks.map((b) => (b.id === blockId ? { ...b, collapsed: !b.collapsed } : b));
}

function expandBlock(blocks: BulkDraftBlock[], blockId: string): BulkDraftBlock[] {
  return blocks.map((b) => (b.id === blockId ? { ...b, collapsed: false } : b));
}

function setBlockDate(blocks: BulkDraftBlock[], blockId: string, date: string): BulkDraftBlock[] {
  return blocks.map((b) => (b.id === blockId ? { ...b, date } : b));
}

function fillPlaceholderCategory(blocks: BulkDraftBlock[], categoryId: string): BulkDraftBlock[] {
  return blocks.map((b) => ({ ...b, rows: fillRowCategory(b.rows, categoryId) }));
}

function fillRowCategory(rows: BulkDraftRow[], categoryId: string): BulkDraftRow[] {
  return rows.map((r) => (r.category === "" ? { ...r, category: categoryId } : r));
}

function commitOnEnter(e: KeyboardEvent<HTMLInputElement>, onCommit: () => void) {
  if (e.key !== "Enter") return;
  e.preventDefault();
  onCommit();
}

// ---------------------------------------------------------------------------
// Custom hooks — each owns one cross-cutting concern's effects, isolated from
// the page component's own body.
// ---------------------------------------------------------------------------

function pickDefaultCategoryId(categories: Category[]): string {
  const others = categories.find((c) => c.name === "Others");
  if (others) return others.id;
  if (categories.length > 0) return categories[0].id;
  return "";
}

function applyDefaultCategory(categoryId: string, setBlocks: Dispatch<SetStateAction<BulkDraftBlock[]>>): void {
  if (!categoryId) return;
  setBlocks((bs) => fillPlaceholderCategory(bs, categoryId));
}

function useDefaultCategoryId(categories: Category[], setBlocks: Dispatch<SetStateAction<BulkDraftBlock[]>>): string {
  const defaultCategoryId = pickDefaultCategoryId(categories);
  useEffect(() => applyDefaultCategory(defaultCategoryId, setBlocks), [defaultCategoryId, setBlocks]);
  return defaultCategoryId;
}

interface DraftPersistence {
  pendingDraft: BulkDraft | null;
  resumeDraft: () => void;
  discardDraft: () => void;
}

function useBulkDraftPersistence(
  blocks: BulkDraftBlock[],
  setBlocks: Dispatch<SetStateAction<BulkDraftBlock[]>>,
): DraftPersistence {
  const [pendingDraft, setPendingDraft] = useState<BulkDraft | null>(null);
  const [draftDecided, setDraftDecided] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getBulkDraft().then((draft) => {
      if (cancelled) return;
      if (draft && draftHasContent(draft)) setPendingDraft(draft);
      setDraftDecided(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!draftDecided || pendingDraft) return;
    const timer = setTimeout(() => void saveBulkDraft({ blocks }), DRAFT_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [blocks, draftDecided, pendingDraft]);

  const resumeDraft = () => {
    if (!pendingDraft) return;
    setBlocks(pendingDraft.blocks);
    setPendingDraft(null);
  };

  const discardDraft = () => {
    setPendingDraft(null);
    void clearBulkDraft();
  };

  return { pendingDraft, resumeDraft, discardDraft };
}

// ---------------------------------------------------------------------------
// Presentational leaves — each renders one concern with no more than a single
// guard clause or ternary of its own.
// ---------------------------------------------------------------------------

function RowFieldError({ message }: { message: string | undefined }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

interface RowAmountCategoryProps {
  row: BulkDraftRow;
  categories: Category[];
  currencySymbol: string;
  errors: RowFieldErrors | undefined;
  onUpdate: (patch: Partial<BulkDraftRow>) => void;
  onRemove: () => void;
  onCommit: () => void;
  registerAmountRef: (el: HTMLInputElement | null) => void;
}

function RowAmountCategory({
  row,
  categories,
  currencySymbol,
  errors,
  onUpdate,
  onRemove,
  onCommit,
  registerAmountRef,
}: RowAmountCategoryProps) {
  const selectedCategory = categories.find((c) => c.id === row.category);

  return (
    <>
      <div className="flex gap-2 items-start">
        <div className="relative w-1/2">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
            {currencySymbol}
          </span>
          <Input
            ref={registerAmountRef}
            aria-label="Amount"
            inputMode="decimal"
            placeholder="0"
            className="pl-7"
            value={row.value}
            onChange={(e) => onUpdate({ value: e.target.value })}
            onKeyDown={(e) => commitOnEnter(e, onCommit)}
          />
        </div>
        <Select value={row.category} onValueChange={(v) => onUpdate({ category: v })}>
          <SelectTrigger aria-label="Category" className="w-1/2">
            <CategorySelectValue category={selectedCategory} placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <CategoryOptionItems categories={categories} />
          </SelectContent>
        </Select>
        <button type="button" aria-label="Remove row" onClick={onRemove} className="p-2 text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
      <RowFieldError message={errors?.amount} />
      <RowFieldError message={errors?.category} />
    </>
  );
}

function RowTagsToggle({ row, onUpdate }: { row: BulkDraftRow; onUpdate: (patch: Partial<BulkDraftRow>) => void }) {
  const [tagsOpen, setTagsOpen] = useState(row.tags.length > 0);
  const [tagInput, setTagInput] = useState("");

  const handleTagKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const value = tagInput.trim();
    if (!canAddTag(row.tags, value)) return;
    onUpdate({ tags: [...row.tags, value] });
    setTagInput("");
  };

  if (!tagsOpen) {
    return (
      <button type="button" onClick={() => setTagsOpen(true)}>
        + tag
      </button>
    );
  }
  return (
    <Input
      aria-label="Add tag"
      placeholder="Add tag"
      value={tagInput}
      onChange={(e) => setTagInput(e.target.value)}
      onKeyDown={handleTagKey}
      className="h-7 w-24 text-xs"
    />
  );
}

interface RowTimeToggleProps {
  block: BulkDraftBlock;
  row: BulkDraftRow;
  today: string;
  onUpdate: (patch: Partial<BulkDraftRow>) => void;
}

function defaultRowTime(block: BulkDraftBlock, today: string): string {
  return block.date === today ? getCurrentTime24() : "12:00";
}

function TimeToggleButton({ open, onClick }: { open: boolean; onClick: () => void }) {
  return (
    <button type="button" aria-label={open ? "Hide time" : "Set time"} onClick={onClick}>
      <Clock className="h-3.5 w-3.5" />
    </button>
  );
}

function RowTimeInput({ open, value, onChange }: { open: boolean; value: string; onChange: (v: string) => void }) {
  if (!open) return null;
  return (
    <Input type="time" aria-label="Time" className="h-7 w-24 text-xs" value={value} onChange={(e) => onChange(e.target.value)} />
  );
}

function RowTimeToggle({ block, row, today, onUpdate }: RowTimeToggleProps) {
  const [timeOpen, setTimeOpen] = useState(row.time !== null);

  return (
    <>
      <TimeToggleButton open={timeOpen} onClick={() => setTimeOpen((v) => !v)} />
      <RowTimeInput
        open={timeOpen}
        value={row.time ?? defaultRowTime(block, today)}
        onChange={(v) => onUpdate({ time: v })}
      />
    </>
  );
}

function RowAdhocToggle({ row, onUpdate }: { row: BulkDraftRow; onUpdate: (patch: Partial<BulkDraftRow>) => void }) {
  return (
    <label className="flex items-center gap-1.5 ml-auto">
      one-off
      <Switch aria-label="One-off" checked={row.isAdhoc} onCheckedChange={(v) => onUpdate({ isAdhoc: v })} />
    </label>
  );
}

interface RowCardProps {
  block: BulkDraftBlock;
  row: BulkDraftRow;
  today: string;
  categories: Category[];
  currencySymbol: string;
  errors: RowFieldErrors | undefined;
  onUpdate: (patch: Partial<BulkDraftRow>) => void;
  onRemove: () => void;
  onCommit: () => void;
  registerAmountRef: (el: HTMLInputElement | null) => void;
  registerRowRef: (el: HTMLDivElement | null) => void;
}

function RowCard({
  block,
  row,
  today,
  categories,
  currencySymbol,
  errors,
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
      className="space-y-1.5 pb-3 border-b border-border last:border-0 last:pb-0"
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
      <Input
        aria-label="Description"
        placeholder="Description"
        value={row.description}
        onChange={(e) => onUpdate({ description: e.target.value })}
        onKeyDown={(e) => commitOnEnter(e, onCommit)}
      />
      <TagChipList tags={row.tags} onRemoveTag={(t) => onUpdate({ tags: row.tags.filter((x) => x !== t) })} />
      <RowFieldError message={errors?.tags} />
      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
        <RowTagsToggle row={row} onUpdate={onUpdate} />
        <RowTimeToggle block={block} row={row} today={today} onUpdate={onUpdate} />
        <RowAdhocToggle row={row} onUpdate={onUpdate} />
      </div>
    </div>
  );
}

function DateChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-2.5 py-1 rounded-full text-xs font-medium border",
        active ? "bg-primary text-primary-foreground border-primary" : "border-input",
      )}
    >
      {label}
    </button>
  );
}

interface BlockDateChipsProps {
  block: BulkDraftBlock;
  today: string;
  yesterday: string;
  onSetDate: (date: string) => void;
}

function BlockDateChips({ block, today, yesterday, onSetDate }: BlockDateChipsProps) {
  return (
    <div className="flex items-center gap-2">
      <DateChip label="Today" active={block.date === today} onClick={() => onSetDate(today)} />
      <DateChip label="Yesterday" active={block.date === yesterday} onClick={() => onSetDate(yesterday)} />
      <input
        type="date"
        aria-label="Custom date"
        value={block.date}
        onChange={(e) => onSetDate(e.target.value)}
        className="h-7 text-xs border border-input rounded-md px-2 bg-background"
      />
    </div>
  );
}

interface BlockHeaderProps {
  block: BulkDraftBlock;
  count: number;
  total: number;
  formatValue: (value: number) => string;
  onToggleCollapse: () => void;
  onRemoveBlock: () => void;
}

function BlockHeader({ block, count, total, formatValue, onToggleCollapse, onRemoveBlock }: BlockHeaderProps) {
  return (
    <div className="flex items-center justify-between p-3 bg-muted/30">
      <button type="button" className="flex items-center gap-2 font-medium text-sm" onClick={onToggleCollapse}>
        <ChevronDown className={cn("h-4 w-4 transition-transform", block.collapsed && "-rotate-90")} />
        {getDateGroupLabel(block.date)} · {count} {count === 1 ? "entry" : "entries"} · {formatValue(total)}
      </button>
      <button
        type="button"
        aria-label="Remove day"
        onClick={onRemoveBlock}
        className="p-1 text-muted-foreground hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

interface BlockBodyProps {
  block: BulkDraftBlock;
  today: string;
  yesterday: string;
  categories: Category[];
  currencySymbol: string;
  errors: Map<string, RowFieldErrors>;
  onSetDate: (date: string) => void;
  onAddRow: () => void;
  onUpdateRow: (rowId: string, patch: Partial<BulkDraftRow>) => void;
  onRemoveRow: (rowId: string) => void;
  registerAmountRef: (rowId: string, el: HTMLInputElement | null) => void;
  registerRowRef: (rowId: string, el: HTMLDivElement | null) => void;
}

function BlockBody({
  block,
  today,
  yesterday,
  categories,
  currencySymbol,
  errors,
  onSetDate,
  onAddRow,
  onUpdateRow,
  onRemoveRow,
  registerAmountRef,
  registerRowRef,
}: BlockBodyProps) {
  if (block.collapsed) return null;

  return (
    <div className="p-3 space-y-3">
      <BlockDateChips block={block} today={today} yesterday={yesterday} onSetDate={onSetDate} />
      {block.rows.map((row) => (
        <RowCard
          key={row.id}
          block={block}
          row={row}
          today={today}
          categories={categories}
          currencySymbol={currencySymbol}
          errors={errors.get(row.id)}
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
  formatValue: (value: number) => string;
  onToggleCollapse: () => void;
  onRemoveBlock: () => void;
}

function BlockCard({ formatValue, onToggleCollapse, onRemoveBlock, ...bodyProps }: BlockCardProps) {
  const { count, total } = blockTotals(bodyProps.block);

  return (
    <div data-testid="bulk-block" className="rounded-xl border border-border overflow-hidden">
      <BlockHeader
        block={bodyProps.block}
        count={count}
        total={total}
        formatValue={formatValue}
        onToggleCollapse={onToggleCollapse}
        onRemoveBlock={onRemoveBlock}
      />
      <BlockBody {...bodyProps} />
    </div>
  );
}

function DraftResumeBanner({
  pendingDraft,
  onResume,
  onDiscard,
}: {
  pendingDraft: BulkDraft | null;
  onResume: () => void;
  onDiscard: () => void;
}) {
  if (!pendingDraft) return null;
  const { count } = pageTotals(pendingDraft.blocks);

  return (
    <div
      data-testid="bulk-draft-prompt"
      className="p-3 rounded-lg border border-border bg-muted/50 flex items-center justify-between gap-3"
    >
      <span className="text-sm">
        Resume your unsaved draft ({count} {count === 1 ? "entry" : "entries"})?
      </span>
      <div className="flex gap-2">
        <Button type="button" size="sm" onClick={onResume}>
          Resume
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDiscard}>
          Discard
        </Button>
      </div>
    </div>
  );
}

function ScaleHint({ totalRowCount }: { totalRowCount: number }) {
  if (totalRowCount <= SCALE_HINT_THRESHOLD) return null;
  return (
    <p className="text-xs text-muted-foreground">
      That's a lot of rows —{" "}
      <Link to="/settings/data/import-csv" className="underline">
        CSV import
      </Link>{" "}
      is faster for big backfills.
    </p>
  );
}

function BulkFooter({
  entryCount,
  grandTotal,
  formatValue,
  onSave,
  disabled,
}: {
  entryCount: number;
  grandTotal: number;
  formatValue: (value: number) => string;
  onSave: () => void;
  disabled: boolean;
}) {
  return (
    <div className="fixed bottom-0 inset-x-0 border-t border-border bg-background/95 backdrop-blur p-3 flex items-center justify-between gap-3 z-40">
      <span className="text-sm text-muted-foreground">
        {entryCount} {entryCount === 1 ? "entry" : "entries"} · {formatValue(grandTotal)}
      </span>
      <Button type="button" onClick={onSave} disabled={disabled}>
        Save all
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function BulkAddPage() {
  const navigate = useNavigate();
  const categories = useCategories();
  const { currency, formatValue } = useCurrency();

  const today = format(new Date(), "yyyy-MM-dd");
  const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");

  const [blocks, setBlocks] = useState<BulkDraftBlock[]>(() => [makeBlock(today, "")]);
  const [rowErrors, setRowErrors] = useState<Map<string, RowFieldErrors>>(new Map());
  const [saving, setSaving] = useState(false);
  const lastCategoryRef = useRef("");
  const amountRefs = useRef(new Map<string, HTMLInputElement>());
  const rowRefs = useRef(new Map<string, HTMLDivElement>());

  const defaultCategoryId = useDefaultCategoryId(categories, setBlocks);
  const { pendingDraft, resumeDraft, discardDraft } = useBulkDraftPersistence(blocks, setBlocks);

  const isDirty = blocks.some(blockHasContent);
  const totalRowCount = blocks.reduce((n, b) => n + b.rows.length, 0);
  const { count: entryCount, total: grandTotal } = pageTotals(blocks);

  const clearRowError = (rowId: string) => {
    setRowErrors((errs) => {
      if (!errs.has(rowId)) return errs;
      const next = new Map(errs);
      next.delete(rowId);
      return next;
    });
  };

  const handleUpdateRow = (blockId: string, rowId: string, patch: Partial<BulkDraftRow>) => {
    if (patch.category) lastCategoryRef.current = patch.category;
    setBlocks((bs) => updateBlockRow(bs, blockId, rowId, patch));
    clearRowError(rowId);
  };

  const handleAddRow = (blockId: string) => {
    const newRow = makeRow(lastCategoryRef.current || defaultCategoryId);
    setBlocks((bs) => addRowToBlock(bs, blockId, newRow));
    requestAnimationFrame(() => amountRefs.current.get(newRow.id)?.focus());
  };

  const handleRemoveRow = (blockId: string, rowId: string) => {
    setBlocks((bs) => removeRowFromBlock(bs, blockId, rowId, lastCategoryRef.current || defaultCategoryId));
  };

  const handleAddBlock = () => {
    const newBlock = makeBlock(today, lastCategoryRef.current || defaultCategoryId);
    setBlocks((bs) => [...bs, newBlock]);
    requestAnimationFrame(() => amountRefs.current.get(newBlock.rows[0].id)?.focus());
  };

  const handleRemoveBlock = (blockId: string) => {
    const block = blocks.find((b) => b.id === blockId);
    if (!block) return;
    if (blockHasContent(block) && !window.confirm("Remove this day and all its entries?")) return;
    setBlocks((bs) => removeBlock(bs, blockId));
  };

  const handleToggleCollapse = (blockId: string) => setBlocks((bs) => toggleBlockCollapse(bs, blockId));
  const handleSetDate = (blockId: string, date: string) => setBlocks((bs) => setBlockDate(bs, blockId, date));

  const handleBack = () => {
    if (isDirty && !window.confirm("Discard your unsaved entries?")) return;
    navigate(-1);
  };

  const commitSave = async (toWrite: ExpenseDraft[]) => {
    setSaving(true);
    try {
      const n = await addExpensesBulk(toWrite);
      await clearBulkDraft();
      toast.success(`${n} expense${n === 1 ? "" : "s"} added`);
      navigate("/");
    } catch {
      toast.error("Couldn't save — nothing was written");
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (saving) return;

    const { toWrite, invalidRows } = partitionRows(blocks, today);
    setRowErrors(toErrorMap(invalidRows));

    const invalid = firstInvalidEntry(invalidRows);
    if (invalid) {
      setBlocks((bs) => expandBlock(bs, invalid.blockId));
      requestAnimationFrame(() => {
        rowRefs.current.get(invalid.rowId)?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      return;
    }

    if (toWrite.length === 0) return;
    await commitSave(toWrite);
  };

  return (
    <div className="px-4 py-6 pb-28 max-w-2xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" aria-label="Go back" onClick={handleBack} className="h-9 w-9">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-semibold">Add many</h1>
      </div>

      <DraftResumeBanner pendingDraft={pendingDraft} onResume={resumeDraft} onDiscard={discardDraft} />

      {blocks.map((block) => (
        <BlockCard
          key={block.id}
          block={block}
          today={today}
          yesterday={yesterday}
          categories={categories}
          currencySymbol={currency.symbol}
          formatValue={formatValue}
          errors={rowErrors}
          onSetDate={(date) => handleSetDate(block.id, date)}
          onToggleCollapse={() => handleToggleCollapse(block.id)}
          onRemoveBlock={() => handleRemoveBlock(block.id)}
          onAddRow={() => handleAddRow(block.id)}
          onUpdateRow={(rowId, patch) => handleUpdateRow(block.id, rowId, patch)}
          onRemoveRow={(rowId) => handleRemoveRow(block.id, rowId)}
          registerAmountRef={(rowId, el) => {
            if (el) amountRefs.current.set(rowId, el);
            else amountRefs.current.delete(rowId);
          }}
          registerRowRef={(rowId, el) => {
            if (el) rowRefs.current.set(rowId, el);
            else rowRefs.current.delete(rowId);
          }}
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
