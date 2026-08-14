import { CategoryIcon } from "@/components/categories/CategoryIcon";
import { Expense, Category } from "@/types/expense";
import { cn } from "@/lib/utils";
import { useLongPress } from "@/hooks/useLongPress";
import { ExpenseCardDetails } from "@/components/expenses/ExpenseCardDetails";
import { ExpenseCardAmount } from "@/components/expenses/ExpenseCardAmount";
import { ExpenseCardContextMenu } from "@/components/expenses/ExpenseCardContextMenu";

interface ExpenseCardProps {
  expense: Expense;
  category?: Category;
  onClick?: () => void;
  onDuplicate?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  showDate?: boolean;
}

export function ExpenseCard({
  expense,
  category,
  onClick,
  onDuplicate,
  onEdit,
  onDelete,
  showDate = true,
}: ExpenseCardProps) {
  const { isLongPressing, handleTouchStart, handleTouchEnd } = useLongPress();

  const cardContent = (
    <button
      data-testid="expense-card"
      type="button"
      className={cn(
        "expense-card appearance-none text-left w-full",
        isLongPressing && "long-press-active",
      )}
      onClick={onClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseUp={handleTouchEnd}
      onMouseLeave={handleTouchEnd}
    >
      <CategoryIcon icon={category?.icon || "MoreHorizontal"} color={category?.color || "#64748B"} size="md" />

      <ExpenseCardDetails
        description={expense.description}
        categoryName={category?.name}
        date={expense.date}
        showDate={showDate}
        tags={expense.tags}
      />

      <ExpenseCardAmount value={expense.value} isAdhoc={expense.isAdhoc} hasAttachment={!!expense.attachment} />
    </button>
  );

  return <ExpenseCardContextMenu trigger={cardContent} onDuplicate={onDuplicate} onEdit={onEdit} onDelete={onDelete} />;
}
