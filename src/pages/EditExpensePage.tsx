import { useNavigate, useParams } from "react-router";
import { LazyMotion, domAnimation, m } from "framer-motion";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExpenseForm } from "@/components/expenses/ExpenseForm";
import { useExpense } from "@/hooks/useExpenseData";
import { deleteExpense } from "@/db/expenseTrackerDb";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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
    } catch (error) {
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
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="h-9 w-9"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold">Edit Expense</h1>
        </div>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <LazyMotion features={domAnimation}>
      <div className="px-4 py-6 max-w-lg mx-auto">
        <m.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(-1)}
                className="h-9 w-9"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-xl font-semibold">Edit Expense</h1>
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-5 w-5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Expense?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this expense? This action
                    cannot be undone.
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

          <ExpenseForm
            expense={expense}
            onSuccess={handleSuccess}
            onCancel={() => navigate(-1)}
          />
        </m.div>
      </div>
    </LazyMotion>
  );
}
