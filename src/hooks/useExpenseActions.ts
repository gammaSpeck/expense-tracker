import { useState } from "react";
import { useNavigate } from "react-router";
import { format } from "date-fns";
import { toast } from "sonner";
import { getCurrentTime24 } from "@/lib/time";
import { deleteExpense } from "@/db/expenseTrackerDb";
import { Expense } from "@/types/expense";

/** Shared expense list actions for HomePage and TransactionsPage. */
export function useExpenseActions() {
  const navigate = useNavigate();
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);

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

  return {
    expenseToDelete,
    setExpenseToDelete,
    handleExpenseClick,
    handleDuplicate,
    handleEdit,
    handleDelete,
  };
}
