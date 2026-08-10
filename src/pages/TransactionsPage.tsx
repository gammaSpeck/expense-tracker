import { useState } from "react";
import { useNavigate, useLocation } from "react-router";
import { Search, ArrowLeft, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ExpenseList } from "@/components/expenses/ExpenseCard";
import { useCategories, useFilteredExpenses } from "@/hooks/useExpenseData";
import { deleteExpense } from "@/db/expenseTrackerDb";
import { toast } from "sonner";
import { format } from "date-fns";
import { getCurrentTime24 } from "@/lib/time";
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

export default function TransactionsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialSearch = location.state?.search || "";

  const [search, setSearch] = useState(initialSearch);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);

  const categories = useCategories();
  const expenses = useFilteredExpenses({ search });

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
    } catch {
      toast.error("Failed to delete");
    }
    setExpenseToDelete(null);
  };

  return (
      <div className="px-4 py-6 max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 animate-slide-in-up">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-9 w-9">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold">All Transactions</h1>
        </div>

        {/* Search */}
        <div
          className="sticky top-0 z-20 bg-background/95 backdrop-blur-xs -mx-4 px-4 py-2 animate-slide-in-up"
          style={{ animationDelay: "50ms", animationFillMode: "backwards" }}
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search transactions..."
              className="pl-10 pr-10"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>
          {expenses.length > 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              Showing {expenses.length} transaction
              {expenses.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>

        {/* Transaction List */}
        <div className="animate-fade-in" style={{ animationDelay: "100ms", animationFillMode: "backwards" }}>
          <ExpenseList
            expenses={expenses}
            categories={categories}
            onExpenseClick={handleExpenseClick}
            onDuplicate={handleDuplicate}
            onEdit={handleEdit}
            onDelete={(expense) => setExpenseToDelete(expense)}
            grouped
            emptyMessage={search ? "No matching transactions" : "No transactions yet"}
          />
        </div>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!expenseToDelete} onOpenChange={() => setExpenseToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Expense?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this expense? This action cannot be undone.
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
