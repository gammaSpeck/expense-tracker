import { AnimatePresence, LazyMotion, domAnimation, m } from "framer-motion";
import { ExpenseListRow } from "@/components/expenses/ExpenseListRow";
import { Expense, Category } from "@/types/expense";

interface FlatExpenseListProps {
  expenses: Expense[];
  categories: Category[];
  onExpenseClick?: (expense: Expense) => void;
  onDuplicate?: (expense: Expense) => void;
  onEdit?: (expense: Expense) => void;
  onDelete?: (expense: Expense) => void;
}

export function FlatExpenseList({
  expenses,
  categories,
  onExpenseClick,
  onDuplicate,
  onEdit,
  onDelete,
}: FlatExpenseListProps) {
  return (
    <div className="space-y-2">
      <LazyMotion features={domAnimation}>
        <AnimatePresence mode="popLayout">
          {expenses.map((expense, index) => (
            <m.div
              key={expense.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: index * 0.02 }}
            >
              <ExpenseListRow
                expense={expense}
                categories={categories}
                onExpenseClick={onExpenseClick}
                onDuplicate={onDuplicate}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            </m.div>
          ))}
        </AnimatePresence>
      </LazyMotion>
    </div>
  );
}
