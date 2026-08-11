import { formatRelativeDate } from "@/lib/expenseDates";

interface ExpenseCardDetailsProps {
  description?: string;
  categoryName?: string;
  date: string;
  showDate: boolean;
  tags: string[];
}

export function ExpenseCardDetails({
  description,
  categoryName,
  date,
  showDate,
  tags,
}: ExpenseCardDetailsProps) {
  return (
    <div className="flex-1 min-w-0">
      <p className="font-medium text-sm truncate text-ellipsis whitespace-nowrap max-w-50 sm:max-w-64">
        {description || categoryName || "Expense"}
      </p>
      <div className="flex items-center gap-2 mt-0.5">
        {showDate && (
          <span className="text-xs text-muted-foreground">{formatRelativeDate(date)}</span>
        )}
        {tags.length > 0 && (
          <div className="flex items-center gap-1 overflow-hidden">
            {tags.slice(0, 2).map((tag) => (
              <span key={tag} className="tag-badge text-[10px] truncate max-w-20">
                {tag}
              </span>
            ))}
            {tags.length > 2 && (
              <span className="text-[10px] text-muted-foreground">+{tags.length - 2}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
