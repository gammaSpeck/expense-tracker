import { ExpenseCard } from "@/components/expenses/ExpenseCard";
import { Expense, Category } from "@/types/expense";

interface ExpenseListRowProps {
  expense: Expense;
  categories: Category[];
  onExpenseClick?: (expense: Expense) => void;
  onDuplicate?: (expense: Expense) => void;
  onEdit?: (expense: Expense) => void;
  onDelete?: (expense: Expense) => void;
  showDate?: boolean;
}

export function ExpenseListRow({
  expense,
  categories,
  onExpenseClick,
  onDuplicate,
  onEdit,
  onDelete,
  showDate,
}: ExpenseListRowProps) {
  return (
    <ExpenseCard
      expense={expense}
      category={categories.find((c) => c.id === expense.category)}
      onClick={() => onExpenseClick?.(expense)}
      onDuplicate={() => onDuplicate?.(expense)}
      onEdit={() => onEdit?.(expense)}
      onDelete={() => onDelete?.(expense)}
      showDate={showDate}
    />
  );
}
