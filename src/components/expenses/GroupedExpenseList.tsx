import { getDateGroupLabel, groupExpensesByDate } from "@/lib/expenseDates";
import { ExpenseListRow } from "@/components/expenses/ExpenseListRow";
import { Expense, Category } from "@/types/expense";

interface GroupedExpenseListProps {
  expenses: Expense[];
  categories: Category[];
  onExpenseClick?: (expense: Expense) => void;
  onDuplicate?: (expense: Expense) => void;
  onEdit?: (expense: Expense) => void;
  onDelete?: (expense: Expense) => void;
}

export function GroupedExpenseList({
  expenses,
  categories,
  onExpenseClick,
  onDuplicate,
  onEdit,
  onDelete,
}: GroupedExpenseListProps) {
  const groups = groupExpensesByDate(expenses);

  return (
    <div className="space-y-6">
      {groups.map(([date, dateExpenses]) => (
        <div key={date}>
          <h3 className="text-sm font-medium text-muted-foreground mb-2">{getDateGroupLabel(date)}</h3>
          <div className="space-y-2">
            {dateExpenses.map((expense) => (
              <ExpenseListRow
                key={expense.id}
                expense={expense}
                categories={categories}
                onExpenseClick={onExpenseClick}
                onDuplicate={onDuplicate}
                onEdit={onEdit}
                onDelete={onDelete}
                showDate={false}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
