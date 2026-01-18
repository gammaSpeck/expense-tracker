import { useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { getCurrentTime24 } from "@/lib/time";
import { Plus, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExpenseList } from "@/components/expenses/ExpenseCard";
import { useCurrency } from "@/contexts/CurrencyContext";
import {
  useMonthSummary,
  useRecentExpenses,
  useCategories,
  useFilteredExpenses,
} from "@/hooks/useExpenseData";
import { deleteExpense } from "@/lib/db";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Expense } from "@/types/expense";
import { useIsMobile } from "@/hooks/use-mobile";

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
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const isMobile = useIsMobile();

  const { total, totalExcludingAdhoc, monthStart, monthEnd } =
    useMonthSummary();
  const { currency, formatValue } = useCurrency();
  const categories = useCategories();
  const displayExpenses = useRecentExpenses(10);

  const handleExpenseClick = (expense: Expense) => {
    navigate(`/expense/${expense.id}`);
  };

  const handleDuplicate = (expense: Expense) => {
    navigate("/add", {
      state: {
        duplicate: {
          ...expense,
          date: format(new Date(), "yyyy-MM-dd"),
          time: getCurrentTime24(),
        },
      },
    });
  };

  const handleEdit = (expense: Expense) => {
    navigate(`/expense/${expense.id}/edit`);
  };

  const handleDelete = async () => {
    if (!expenseToDelete) return;
    try {
      await deleteExpense(expenseToDelete.id);
      toast.success("Expense deleted");
    } catch (error) {
      toast.error("Failed to delete");
    }
    setExpenseToDelete(null);
  };

  return (
    <div className="px-4 py-6 space-y-6 max-w-2xl mx-auto">
      {/* Monthly Summary Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="summary-card"
      >
        <p className="text-sm opacity-80">This Month's Expenses</p>
        <p className="text-3xl font-bold mt-1">
          {currency.symbol}
          {formatValue(total)}
        </p>
        {totalExcludingAdhoc !== total && (
          <p className="text-sm opacity-70 mt-1">
            Excluding Adhoc: {currency.symbol}
            {formatValue(totalExcludingAdhoc)}
          </p>
        )}
        <p className="text-xs opacity-60 mt-2">
          {format(monthStart, "d MMM")} - {format(monthEnd, "d MMM yyyy")}
        </p>
      </motion.div>

      {/* Recent Transactions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent Transactions</h2>
          {displayExpenses.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/transactions")}
              className="text-primary"
            >
              See All
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>

        <ExpenseList
          expenses={displayExpenses}
          categories={categories}
          onExpenseClick={handleExpenseClick}
          onDuplicate={handleDuplicate}
          onEdit={handleEdit}
          onDelete={(expense) => setExpenseToDelete(expense)}
          emptyMessage={"No expenses yet. Add your first one!"}
        />
      </motion.div>

      {/* FAB */}
      {isMobile && <FloatingActionButton />}

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!expenseToDelete}
        onOpenChange={() => setExpenseToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Expense?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this expense? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
