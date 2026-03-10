import { useNavigate, useLocation } from "react-router";
import { LazyMotion, domAnimation, m } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExpenseForm } from "@/components/expenses/ExpenseForm";
import { Expense } from "@/types/expense";

export default function AddExpensePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const duplicateData = location.state?.duplicate as Expense;

  return (
    <LazyMotion features={domAnimation}>
      <div className="px-4 py-6 max-w-lg mx-auto">
        <m.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
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
        </m.div>
      </div>
    </LazyMotion>
  );
}
