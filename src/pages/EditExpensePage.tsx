import { useNavigate, useParams } from "react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExpenseForm } from "@/components/expenses/ExpenseForm";
import { useExpense } from "@/hooks/useExpenseData";
import { deleteExpense } from "@/db/expenseTrackerDb";
import { toast } from "sonner";
import { EditExpenseHeader } from "@/components/expenses/EditExpenseHeader";

export default function EditExpensePage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const expense = useExpense(id);

  const handleDelete = async () => {
    if (!id) return;

    try {
      await deleteExpense(id);
      toast.success("Expense deleted");
      navigate("/");
    } catch {
      toast.error("Failed to delete expense");
    }
  };

  const handleSuccess = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  if (!expense) {
    return (
      <div className="px-4 py-6 max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" aria-label="Go back" onClick={() => navigate(-1)} className="h-9 w-9">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold">Edit Expense</h1>
        </div>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      <div className="space-y-6 animate-slide-in-up">
        <EditExpenseHeader onBack={() => navigate(-1)} onDelete={handleDelete} />

        <ExpenseForm expense={expense} onSuccess={handleSuccess} onCancel={() => navigate(-1)} />
      </div>
    </div>
  );
}
