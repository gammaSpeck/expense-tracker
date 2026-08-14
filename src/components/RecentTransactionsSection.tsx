import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExpenseList } from "@/components/expenses/ExpenseList";
import { Category, Expense } from "@/types/expense";

interface RecentTransactionsSectionProps {
  expenses: Expense[];
  categories: Category[];
  onSeeAll: () => void;
  onExpenseClick: (expense: Expense) => void;
  onDuplicate: (expense: Expense) => void;
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
}

export function RecentTransactionsSection({
  expenses,
  categories,
  onSeeAll,
  onExpenseClick,
  onDuplicate,
  onEdit,
  onDelete,
}: RecentTransactionsSectionProps) {
  return (
    <div
      className="space-y-4 animate-slide-in-up"
      style={{ animationDelay: "200ms", animationFillMode: "backwards" }}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Recent Transactions</h2>
        {expenses.length > 0 && (
          <Button variant="ghost" size="sm" onClick={onSeeAll} className="text-primary">
            See All
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>

      <ExpenseList
        expenses={expenses}
        categories={categories}
        onExpenseClick={onExpenseClick}
        onDuplicate={onDuplicate}
        onEdit={onEdit}
        onDelete={onDelete}
        emptyMessage={"No expenses yet. Add your first one!"}
      />
    </div>
  );
}
