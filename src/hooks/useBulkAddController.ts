import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { format, subDays } from "date-fns";
import { toast } from "sonner";
import { useCategories } from "@/hooks/useExpenseData";
import { useCurrency } from "@/contexts/CurrencyContext";
import { addExpensesBulk, getDescriptionSuggestions, getTagSuggestions } from "@/db/expenseTrackerDb";
import { clearBulkDraft } from "@/db/bulkDraft";
import type { BulkDraftBlock, BulkDraftRow } from "@/db/bulkDraft";
import { useBulkDraftPersistence } from "@/hooks/useBulkDraftPersistence";
import {
  makeBlock,
  makeRow,
  blockHasContent,
  pageTotals,
  updateBlockRow,
  addRowToBlock,
  removeRowFromBlock,
  removeBlock,
  toggleBlockCollapse,
  expandBlock,
  setBlockDate,
  fillPlaceholderCategory,
  partitionRows,
  firstInvalidEntry,
  toErrorMap,
  pickDefaultCategoryId,
} from "@/lib/bulkAddDraft";
import type { ExpenseDraft, RowFieldErrors } from "@/lib/bulkAddDraft";

/** Owns all bulk-add page state: the blocks[] draft, its localStorage-backed autosave/resume,
 *  suggestion data, validation, and save. The page only renders. */
export function useBulkAddController() {
  const navigate = useNavigate();
  const categories = useCategories();
  const { currency, formatValue } = useCurrency();

  const today = format(new Date(), "yyyy-MM-dd");
  const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");
  const defaultCategoryId = pickDefaultCategoryId(categories);

  const [blocks, setBlocks] = useState<BulkDraftBlock[]>(() => [makeBlock(today, "")]);
  const [rowErrors, setRowErrors] = useState<Map<string, RowFieldErrors>>(new Map());
  const [saving, setSaving] = useState(false);
  const [allDescriptions, setAllDescriptions] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const lastCategoryRef = useRef("");
  const amountRefs = useRef(new Map<string, HTMLInputElement>());
  const rowRefs = useRef(new Map<string, HTMLDivElement>());

  useEffect(() => {
    // Suggestions are optional — a read failure must not surface as an unhandled rejection.
    getDescriptionSuggestions(undefined, 500)
      .then(setAllDescriptions)
      .catch(() => setAllDescriptions([]));
    getTagSuggestions(500)
      .then(setAllTags)
      .catch(() => setAllTags([]));
  }, []);

  useEffect(() => {
    if (!defaultCategoryId) return;
    setBlocks((bs) => fillPlaceholderCategory(bs, defaultCategoryId));
  }, [defaultCategoryId]);

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
    setBlocks((bs) =>
      removeRowFromBlock(bs, blockId, rowId, lastCategoryRef.current || defaultCategoryId),
    );
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

  const handleToggleCollapse = (blockId: string) =>
    setBlocks((bs) => toggleBlockCollapse(bs, blockId));
  const handleSetDate = (blockId: string, date: string) =>
    setBlocks((bs) => setBlockDate(bs, blockId, date));

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

  const registerAmountRef = (rowId: string, el: HTMLInputElement | null) => {
    if (el) amountRefs.current.set(rowId, el);
    else amountRefs.current.delete(rowId);
  };

  const registerRowRef = (rowId: string, el: HTMLDivElement | null) => {
    if (el) rowRefs.current.set(rowId, el);
    else rowRefs.current.delete(rowId);
  };

  return {
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
  };
}
