import type { KeyboardEvent } from "react";
import { getCurrentTime24 } from "@/lib/time";
import type { BulkDraft, BulkDraftBlock, BulkDraftRow } from "@/db/bulkDraft";
import type { Category, Expense } from "@/types/expense";

export type RowFieldErrors = { amount?: string; category?: string; tags?: string };
export type ExpenseDraft = Omit<Expense, "id" | "createdAt" | "updatedAt">;

// ---------------------------------------------------------------------------
// Pure helpers — row/block shape, validation, and the blocks[] state reducers
// behind the bulk-add page. No React, no JSX: cheap to reason about and cheap
// to unit test on their own, and isolated from the UI's churn.
// ---------------------------------------------------------------------------

export function isRowBlank(row: BulkDraftRow): boolean {
  return row.value.trim() === "" && row.description.trim() === "" && row.tags.length === 0;
}

export function blockHasContent(block: BulkDraftBlock): boolean {
  return block.rows.some((r) => !isRowBlank(r));
}

export function makeRow(category: string): BulkDraftRow {
  return {
    id: crypto.randomUUID(),
    value: "",
    category,
    description: "",
    tags: [],
    time: null,
    isAdhoc: false,
  };
}

export function makeBlock(date: string, category: string): BulkDraftBlock {
  return { id: crypto.randomUUID(), date, collapsed: false, rows: [makeRow(category)] };
}

export function blockTotals(block: BulkDraftBlock): { count: number; total: number } {
  const nonBlank = block.rows.filter((r) => !isRowBlank(r));
  return {
    count: nonBlank.length,
    total: nonBlank.reduce((sum, r) => sum + (Number(r.value) || 0), 0),
  };
}

export function pageTotals(blocks: BulkDraftBlock[]): { count: number; total: number } {
  return blocks.reduce(
    (acc, b) => {
      const t = blockTotals(b);
      return { count: acc.count + t.count, total: acc.total + t.total };
    },
    { count: 0, total: 0 },
  );
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

export function validateRow(row: BulkDraftRow): RowFieldErrors {
  const trimmedValue = row.value.trim();
  return {
    amount: amountFormatError(trimmedValue) ?? amountRangeError(Number(trimmedValue)),
    category: row.category === "" ? "Category required" : undefined,
    tags: row.tags.length > 4 ? "Maximum 4 tags" : undefined,
  };
}

export function canAddTag(tags: string[], value: string): boolean {
  return value !== "" && tags.length < 4 && !tags.includes(value);
}

function buildExpenseDraft(block: BulkDraftBlock, row: BulkDraftRow, today: string): ExpenseDraft {
  return {
    value: Number(row.value),
    category: row.category,
    description: row.description.trim() || undefined,
    tags: row.tags,
    date: block.date,
    time: row.time ?? (block.date === today ? getCurrentTime24() : "12:00"),
    isAdhoc: row.isAdhoc,
  };
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
export function partitionRows(blocks: BulkDraftBlock[], today: string): PartitionResult {
  const toWrite: ExpenseDraft[] = [];
  const invalidRows = new Map<string, InvalidRow>();

  for (const block of blocks) {
    for (const row of block.rows) {
      if (isRowBlank(row)) continue;
      const errors = validateRow(row);
      if (errors.amount || errors.category || errors.tags) {
        invalidRows.set(row.id, { blockId: block.id, errors });
      } else {
        toWrite.push(buildExpenseDraft(block, row, today));
      }
    }
  }

  return { toWrite, invalidRows };
}

export function firstInvalidEntry(
  invalidRows: Map<string, InvalidRow>,
): { rowId: string; blockId: string } | null {
  const first = invalidRows.entries().next();
  return first.done ? null : { rowId: first.value[0], blockId: first.value[1].blockId };
}

export function toErrorMap(invalidRows: Map<string, InvalidRow>): Map<string, RowFieldErrors> {
  return new Map(Array.from(invalidRows, ([id, v]) => [id, v.errors]));
}

export function draftHasContent(draft: BulkDraft): boolean {
  return draft.blocks.some(blockHasContent);
}

// blocks[] reducers — each takes the prior state and returns the next, so every handler in
// the controller hook is a one-line `setBlocks(bs => ...)` call.

export function updateBlockRow(
  blocks: BulkDraftBlock[],
  blockId: string,
  rowId: string,
  patch: Partial<BulkDraftRow>,
): BulkDraftBlock[] {
  return blocks.map((b) =>
    b.id !== blockId
      ? b
      : { ...b, rows: b.rows.map((r) => (r.id !== rowId ? r : { ...r, ...patch })) },
  );
}

export function addRowToBlock(
  blocks: BulkDraftBlock[],
  blockId: string,
  row: BulkDraftRow,
): BulkDraftBlock[] {
  return blocks.map((b) => (b.id === blockId ? { ...b, rows: [...b.rows, row] } : b));
}

export function removeRowFromBlock(
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

export function removeBlock(blocks: BulkDraftBlock[], blockId: string): BulkDraftBlock[] {
  return blocks.filter((b) => b.id !== blockId);
}

export function toggleBlockCollapse(blocks: BulkDraftBlock[], blockId: string): BulkDraftBlock[] {
  return blocks.map((b) => (b.id === blockId ? { ...b, collapsed: !b.collapsed } : b));
}

export function expandBlock(blocks: BulkDraftBlock[], blockId: string): BulkDraftBlock[] {
  return blocks.map((b) => (b.id === blockId ? { ...b, collapsed: false } : b));
}

export function setBlockDate(
  blocks: BulkDraftBlock[],
  blockId: string,
  date: string,
): BulkDraftBlock[] {
  return blocks.map((b) => (b.id === blockId ? { ...b, date } : b));
}

export function fillPlaceholderCategory(
  blocks: BulkDraftBlock[],
  categoryId: string,
): BulkDraftBlock[] {
  return blocks.map((b) => ({
    ...b,
    rows: b.rows.map((r) => (r.category === "" ? { ...r, category: categoryId } : r)),
  }));
}

export function commitOnEnter(e: KeyboardEvent<HTMLInputElement>, onCommit: () => void) {
  if (e.key !== "Enter") return;
  e.preventDefault();
  onCommit();
}

export function pickDefaultCategoryId(categories: Category[]): string {
  const others = categories.find((c) => c.name === "Others");
  if (others) return others.id;
  if (categories.length > 0) return categories[0].id;
  return "";
}

const DESCRIPTION_SUGGESTION_MIN_LENGTH = 2;
const DESCRIPTION_SUGGESTION_LIMIT = 8;
const TAG_SUGGESTION_MIN_LENGTH = 2;
const TAG_SUGGESTION_LIMIT = 8;

export function filterDescriptions(all: string[], query: string): string[] {
  const trimmed = query.trim().toLowerCase();
  if (trimmed.length < DESCRIPTION_SUGGESTION_MIN_LENGTH) return [];
  return all
    .filter((d) => d.toLowerCase().includes(trimmed))
    .slice(0, DESCRIPTION_SUGGESTION_LIMIT);
}

export function filterTags(all: string[], query: string, exclude: string[]): string[] {
  const trimmed = query.trim().toLowerCase();
  if (trimmed.length < TAG_SUGGESTION_MIN_LENGTH) return [];
  return all
    .filter((t) => !exclude.includes(t) && t.toLowerCase().includes(trimmed))
    .slice(0, TAG_SUGGESTION_LIMIT);
}
