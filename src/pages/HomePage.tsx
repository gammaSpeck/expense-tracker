import { useRef } from "react";
import { useNavigate } from "react-router";
import { Plus } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useMonthSummary, useRecentExpenses, useCategories } from "@/hooks/useExpenseData";
import { useExpenseActions } from "@/hooks/useExpenseActions";
import { useIsMobile } from "@/hooks/use-mobile";
import { MonthlySummaryCard } from "@/components/MonthlySummaryCard";
import { RecentTransactionsSection } from "@/components/RecentTransactionsSection";
import { DeleteExpenseDialog } from "@/components/expenses/DeleteExpenseDialog";

const LONG_PRESS_MS = 400; // under iOS's ~500ms text-selection callout timing
const MOVE_CANCEL_PX = 10;

export function FloatingActionButton() {
  const navigate = useNavigate();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const suppressClickRef = useRef(false);

  const clearPressTimer = () => {
    clearTimeout(timerRef.current ?? undefined);
    timerRef.current = null;
    startRef.current = null;
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    startRef.current = { x: e.clientX, y: e.clientY };
    timerRef.current = setTimeout(() => {
      suppressClickRef.current = true;
      navigator.vibrate?.(15);
      navigate("/add/bulk");
    }, LONG_PRESS_MS);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!startRef.current) return;
    const dx = e.clientX - startRef.current.x;
    const dy = e.clientY - startRef.current.y;
    if (Math.hypot(dx, dy) > MOVE_CANCEL_PX) clearPressTimer();
  };

  const handleClick = () => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    navigate("/add");
  };

  return (
    <button
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={clearPressTimer}
      onPointerLeave={clearPressTimer}
      onContextMenu={(e) => e.preventDefault()}
      onClick={handleClick}
      className="fixed bottom-20 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center z-50 fab select-none touch-manipulation [-webkit-touch-callout:none]"
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
