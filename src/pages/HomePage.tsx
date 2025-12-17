import { useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { Search, Plus, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ExpenseList } from "@/components/expenses/ExpenseCard";
import {
  useMonthSummary,
  useRecentExpenses,
  useCategories,
  useFilteredExpenses,
} from "@/hooks/useExpenseData";
import { deleteExpense } from "@/lib/db";
import { useToast } from "@/hooks/use-toast";
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

export default function HomePage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);

  const { total, totalExcludingAdhoc, monthStart, monthEnd } =
    useMonthSummary();
  const categories = useCategories();
  const filteredExpenses = useFilteredExpenses({ search });
  const displayExpenses = search
    ? filteredExpenses
    : filteredExpenses.slice(0, 10);

  const handleExpenseClick = (expense: Expense) => {
    navigate(`/expense/${expense.id}`);
  };

  const handleDuplicate = (expense: Expense) => {
    navigate("/add", {
      state: {
        duplicate: {
          ...expense,
          date: format(new Date(), "yyyy-MM-dd"),
          time: format(new Date(), "HH:mm"),
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
      toast({ title: "Expense deleted" });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete",
        variant: "destructive",
      });
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
          ₹{total.toLocaleString("en-IN")}
        </p>
        {totalExcludingAdhoc !== total && (
          <p className="text-sm opacity-70 mt-1">
            Excluding Adhoc: ₹{totalExcludingAdhoc.toLocaleString("en-IN")}
          </p>
        )}
        <p className="text-xs opacity-60 mt-2">
          {format(monthStart, "d MMM")} - {format(monthEnd, "d MMM yyyy")}
        </p>
      </motion.div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="relative"
      >
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by description, category, or tag..."
          className="pl-10"
        />
      </motion.div>

      {/* Recent Transactions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {search ? "Search Results" : "Recent Transactions"}
          </h2>
          {!search && displayExpenses.length > 0 && (
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
          emptyMessage={
            search
              ? "No matching expenses"
              : "No expenses yet. Add your first one!"
          }
        />

        {search && filteredExpenses.length > 10 && (
          <p className="text-center text-sm text-muted-foreground">
            Showing 10 of {filteredExpenses.length} results.{" "}
            <button
              onClick={() => navigate("/transactions", { state: { search } })}
              className="text-primary hover:underline"
            >
              View all
            </button>
          </p>
        )}
      </motion.div>

      {/* FAB */}
      <button
        onClick={() => navigate("/add")}
        className="fab"
        aria-label="Add expense"
      >
        <Plus className="h-6 w-6" />
      </button>

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
