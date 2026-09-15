import { useCallback, useMemo, useState } from "react";
import {
  buildExpenseFilters,
  EMPTY_FILTER_STATE,
  type TransactionFilterState,
} from "@/lib/transactionFilters";

/** Owns all TransactionsPage filter state: category/tag/amount/date/ad-hoc toggles, plus
 *  the derived `ExpenseFilters` object passed to `useFilteredExpenses`. */
export function useTransactionFilters(search: string, initial?: Partial<TransactionFilterState>) {
  const [state, setState] = useState<TransactionFilterState>(() => ({
    ...EMPTY_FILTER_STATE,
    ...initial,
  }));

  const filters = useMemo(() => buildExpenseFilters(state, search), [state, search]);

  const patch = useCallback(
    (next: Partial<TransactionFilterState>) => setState((s) => ({ ...s, ...next })),
    [],
  );

  const toggleCategory = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      categories: s.categories.includes(id)
        ? s.categories.filter((c) => c !== id)
        : [...s.categories, id],
    }));
  }, []);

  const toggleTag = useCallback((tag: string) => {
    setState((s) => ({
      ...s,
      tags: s.tags.includes(tag) ? s.tags.filter((t) => t !== tag) : [...s.tags, tag],
    }));
  }, []);

  const clearAll = useCallback(() => setState(EMPTY_FILTER_STATE), []);

  const removeChip = useCallback(
    (id: string) => {
      if (id.startsWith("category:")) return toggleCategory(id.slice("category:".length));
      if (id.startsWith("tag:")) return toggleTag(id.slice("tag:".length));
      if (id === "amount") return patch({ minAmount: "", maxAmount: "" });
      if (id === "date") return patch({ datePreset: "all", customRange: undefined });
      if (id === "adhoc") return patch({ excludeAdhoc: false });
    },
    [patch, toggleCategory, toggleTag],
  );

  return { state, filters, patch, toggleCategory, toggleTag, removeChip, clearAll };
}
