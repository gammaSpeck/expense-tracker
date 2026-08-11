import { FlatExpenseList } from "@/components/expenses/FlatExpenseList";
import { GroupedExpenseList } from "@/components/expenses/GroupedExpenseList";
import { Expense, Category } from "@/types/expense";

interface ExpenseListProps {
  expenses: Expense[];
  categories: Category[];
  onExpenseClick?: (expense: Expense) => void;
  onDuplicate?: (expense: Expense) => void;
  onEdit?: (expense: Expense) => void;
  onDelete?: (expense: Expense) => void;
  grouped?: boolean;
  emptyMessage?: string;
}

export function ExpenseList({
  expenses,
  categories,
  onExpenseClick,
  onDuplicate,
  onEdit,
  onDelete,
  grouped = false,
  emptyMessage = "No expenses yet",
}: ExpenseListProps) {
  if (expenses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  const listProps = { expenses, categories, onExpenseClick, onDuplicate, onEdit, onDelete };

  return grouped ? <GroupedExpenseList {...listProps} /> : <FlatExpenseList {...listProps} />;
}
