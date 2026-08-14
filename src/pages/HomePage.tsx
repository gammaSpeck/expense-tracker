import { useNavigate } from "react-router";
import { Plus } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useMonthSummary, useRecentExpenses, useCategories } from "@/hooks/useExpenseData";
import { useExpenseActions } from "@/hooks/useExpenseActions";
import { useIsMobile } from "@/hooks/use-mobile";
import { MonthlySummaryCard } from "@/components/MonthlySummaryCard";
import { RecentTransactionsSection } from "@/components/RecentTransactionsSection";
import { DeleteExpenseDialog } from "@/components/expenses/DeleteExpenseDialog";

export function FloatingActionButton() {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate("/add")}
      className="fixed bottom-20 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center  z-50 fab"
      aria-label="Add expense"
    >
      <Plus className="h-6 w-6" />
    </button>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const { total, totalExcludingAdhoc, monthStart, monthEnd } = useMonthSummary();
  const { currency, formatValue } = useCurrency();
  const categories = useCategories();
  const displayExpenses = useRecentExpenses(10);

  const {
    expenseToDelete,
    setExpenseToDelete,
    handleExpenseClick,
    handleDuplicate,
    handleEdit,
    handleDelete,
  } = useExpenseActions();

  return (
    <div className="px-4 py-6 space-y-6 max-w-2xl mx-auto">
      <MonthlySummaryCard
        total={total}
        totalExcludingAdhoc={totalExcludingAdhoc}
        monthStart={monthStart}
        monthEnd={monthEnd}
        currencySymbol={currency.symbol}
        formatValue={formatValue}
      />

      <RecentTransactionsSection
        expenses={displayExpenses}
        categories={categories}
        onSeeAll={() => navigate("/transactions")}
        onExpenseClick={handleExpenseClick}
        onDuplicate={handleDuplicate}
        onEdit={handleEdit}
        onDelete={setExpenseToDelete}
      />

      {/* FAB */}
      {isMobile && <FloatingActionButton />}

      <DeleteExpenseDialog
        mode="controlled"
        open={!!expenseToDelete}
        onOpenChange={() => setExpenseToDelete(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
