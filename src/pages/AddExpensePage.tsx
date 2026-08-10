import { useNavigate, useLocation } from "react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExpenseForm } from "@/components/expenses/ExpenseForm";
import { Expense } from "@/types/expense";

export default function AddExpensePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const duplicateData = location.state?.duplicate as Expense;

  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      <div className="space-y-6 animate-slide-in-up">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-9 w-9">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold">Add Expense</h1>
        </div>

        <ExpenseForm
          duplicate={duplicateData}
          onSuccess={() => navigate("/")}
          onCancel={() => navigate(-1)}
        />
      </div>
    </div>
  );
}
