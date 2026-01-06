import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  format,
  formatDistanceToNow,
  parseISO,
  isToday,
  isYesterday,
} from "date-fns";
import { CategoryIcon } from "@/components/categories/CategoryIcon";
import { Expense, Category, ContextMenuAction } from "@/types/expense";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Paperclip, Copy, Edit, Trash2 } from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

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
  const [isLongPressing, setIsLongPressing] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  const formatRelativeDate = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    return formatDistanceToNow(date, { addSuffix: true });
  };

  const handleTouchStart = () => {
    setIsLongPressing(true);
    longPressTimer.current = setTimeout(() => {
      // Long press detected - context menu will handle it
    }, 750);
  };

  const handleTouchEnd = () => {
    setIsLongPressing(false);
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  useEffect(() => {
    return () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
    };
  }, []);

  const cardContent = (
    <div
      className={cn("expense-card", isLongPressing && "long-press-active")}
      onClick={onClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseUp={handleTouchEnd}
      onMouseLeave={handleTouchEnd}
    >
      <CategoryIcon
        icon={category?.icon || "MoreHorizontal"}
        color={category?.color || "#64748B"}
        size="md"
      />

      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate overflow-ellipsis whitespace-nowrap max-w-50 sm:max-w-[16rem]">
          {expense.description || category?.name || "Expense"}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          {showDate && (
            <span className="text-xs text-muted-foreground">
              {formatRelativeDate(expense.date)}
            </span>
          )}
          {expense.tags.length > 0 && (
            <div className="flex items-center gap-1 overflow-hidden">
              {expense.tags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="tag-badge text-[10px] truncate max-w-20"
                >
                  {tag}
                </span>
              ))}
              {expense.tags.length > 2 && (
                <span className="text-[10px] text-muted-foreground">
                  +{expense.tags.length - 2}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col items-end gap-1">
        <span className="font-semibold text-sm">
          <ExpenseValue value={expense.value} />
        </span>
        <div className="flex items-center gap-1">
          {expense.isAdhoc && (
            <span className="adhoc-badge text-[10px]">Adhoc</span>
          )}
          {expense.attachment && (
            <Paperclip className="h-3 w-3 text-muted-foreground" />
          )}
        </div>
      </div>
    </div>
  );

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{cardContent}</ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem onClick={onDuplicate}>
          <Copy className="h-4 w-4 mr-2" />
          Duplicate
        </ContextMenuItem>
        <ContextMenuItem onClick={onEdit}>
          <Edit className="h-4 w-4 mr-2" />
          Edit
        </ContextMenuItem>
        <ContextMenuItem
          onClick={onDelete}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

function ExpenseValue({ value }: { value: number }) {
  const { currency, formatValue } = useCurrency();
  return (
    <>
      {currency.symbol}
      {formatValue(value)}
    </>
  );
}

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
  const getCategoryById = (id: string) => categories.find((c) => c.id === id);

  if (expenses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  if (!grouped) {
    return (
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {expenses.map((expense, index) => (
            <motion.div
              key={expense.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: index * 0.02 }}
            >
              <ExpenseCard
                expense={expense}
                category={getCategoryById(expense.category)}
                onClick={() => onExpenseClick?.(expense)}
                onDuplicate={() => onDuplicate?.(expense)}
                onEdit={() => onEdit?.(expense)}
                onDelete={() => onDelete?.(expense)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    );
  }

  // Group by date
  const grouped_expenses = expenses.reduce((acc, expense) => {
    const date = expense.date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(expense);
    return acc;
  }, {} as Record<string, Expense[]>);

  const sortedDates = Object.keys(grouped_expenses).sort((a, b) =>
    b.localeCompare(a)
  );

  const getDateLabel = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    return format(date, "EEEE, d MMM");
  };

  return (
    <div className="space-y-6">
      {sortedDates.map((date) => (
        <div key={date}>
          <h3 className="text-sm font-medium text-muted-foreground mb-2">
            {getDateLabel(date)}
          </h3>
          <div className="space-y-2">
            {grouped_expenses[date].map((expense) => (
              <ExpenseCard
                key={expense.id}
                expense={expense}
                category={getCategoryById(expense.category)}
                onClick={() => onExpenseClick?.(expense)}
                onDuplicate={() => onDuplicate?.(expense)}
                onEdit={() => onEdit?.(expense)}
                onDelete={() => onDelete?.(expense)}
                showDate={false}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
