import { useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router";
import { ArrowLeft, Funnel } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExpenseList } from "@/components/expenses/ExpenseList";
import { TransactionSearchBar } from "@/components/expenses/TransactionSearchBar";
import { ActiveFilterChips } from "@/components/expenses/ActiveFilterChips";
import { TransactionFilterSheet } from "@/components/expenses/TransactionFilterSheet";
import { DeleteExpenseDialog } from "@/components/expenses/DeleteExpenseDialog";
import { useCategories, useFilteredExpenses, useTags } from "@/hooks/useExpenseData";
import { useExpenseActions } from "@/hooks/useExpenseActions";
import { useIncrementalReveal } from "@/hooks/useIncrementalReveal";
import { useTransactionFilters } from "@/hooks/useTransactionFilters";
import { useCurrency } from "@/contexts/CurrencyContext";
import { activeFilterChips } from "@/lib/transactionFilters";
import { TRANSACTIONS_PAGE_SIZE } from "@/config";

export default function TransactionsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const navState = location.state as {
    search?: string;
    filterTag?: string;
    filterCategory?: string;
  } | null;

  const [search, setSearch] = useState(navState?.search || "");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const categories = useCategories();
  const tags = useTags();
  const { currency, formatValue } = useCurrency();

  const { state, filters, patch, toggleCategory, toggleTag, removeChip, clearAll } =
    useTransactionFilters(search, {
      ...(navState?.filterTag ? { tags: [navState.filterTag] } : {}),
      ...(navState?.filterCategory ? { categories: [navState.filterCategory] } : {}),
    });

  const expenses = useFilteredExpenses(filters);
  const chips = useMemo(
    () => activeFilterChips(state, categories, (v) => `${currency.symbol}${formatValue(v)}`),
    [state, categories, currency.symbol, formatValue],
  );
  const {
    visible: visibleExpenses,
    hasMore,
    sentinelRef,
  } = useIncrementalReveal(expenses, TRANSACTIONS_PAGE_SIZE, filters);

  const {
    expenseToDelete,
    setExpenseToDelete,
    handleExpenseClick,
    handleDuplicate,
    handleEdit,
    handleDelete,
  } = useExpenseActions();

  return (
    <div className="px-4 pt-6 pb-24 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 animate-slide-in-up">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-9 w-9">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-semibold">All Transactions</h1>
      </div>

      <TransactionSearchBar
        search={search}
        onSearchChange={setSearch}
        resultCount={expenses.length}
      >
        <ActiveFilterChips chips={chips} onRemove={removeChip} onClearAll={clearAll} />
      </TransactionSearchBar>

      {/* Transaction List */}
      <div
        className="animate-fade-in"
        style={{ animationDelay: "100ms", animationFillMode: "backwards" }}
      >
        <ExpenseList
          expenses={visibleExpenses}
          categories={categories}
          onExpenseClick={handleExpenseClick}
          onDuplicate={handleDuplicate}
          onEdit={handleEdit}
          onDelete={setExpenseToDelete}
          grouped
          emptyMessage={search || chips.length ? "No matching transactions" : "No transactions yet"}
        />
        {hasMore && <div ref={sentinelRef} data-testid="load-more-sentinel" className="h-1" />}
      </div>

      <button
        type="button"
        onClick={() => setFiltersOpen(true)}
        aria-label="Filters"
        className="fixed bottom-24 right-4 z-50 h-14 w-14 rounded-full shadow-md flex items-center justify-center bg-card border border-border text-primary hover:bg-muted active:scale-95 transition-all duration-200"
      >
        <Funnel className="h-6 w-6" />
        {chips.length > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full border border-border bg-background px-1 text-xs font-semibold text-foreground">
            {chips.length}
          </span>
        )}
      </button>

      <TransactionFilterSheet
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        state={state}
        patch={patch}
        toggleCategory={toggleCategory}
        toggleTag={toggleTag}
        onClearAll={clearAll}
        categories={categories}
        tags={tags}
        resultCount={expenses.length}
        activeCount={chips.length}
      />

      <DeleteExpenseDialog
        mode="controlled"
        open={!!expenseToDelete}
        onOpenChange={() => setExpenseToDelete(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
