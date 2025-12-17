import { useNavigate, useParams } from "react-router";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExpenseForm } from "@/components/expenses/ExpenseForm";
import { useExpense } from "@/hooks/useExpenseData";

export default function EditExpensePage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const expense = useExpense(id);

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
    <div className="px-4 py-6 max-w-lg mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
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

        <ExpenseForm
          expense={expense}
          onSuccess={() => navigate(-1)}
          onCancel={() => navigate(-1)}
        />
      </motion.div>
    </div>
  );
}
