import { Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CategoryIcon } from "@/components/categories/CategoryIcon";
import { Category } from "@/types/expense";
import { cn } from "@/lib/utils";

interface CategoryGridProps {
  categories: Category[];
  expenseCounts: Record<string, number>;
  onEdit: (category: Category) => void;
  onDeleteClick: (category: Category) => void;
}

export function CategoryGrid({ categories, expenseCounts, onEdit, onDeleteClick }: CategoryGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {categories.map((category, index) => (
        <div
          key={category.id}
          style={{ animationDelay: `${index * 30}ms`, animationFillMode: "backwards" }}
          className={cn(
            "p-4 rounded-xl bg-card border border-border/50 animate-slide-in-up",
            "flex items-center gap-3",
            "hover:border-primary/20 transition-colors",
          )}
        >
          <CategoryIcon icon={category.icon} color={category.color} size="lg" />

          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{category.name}</p>
            <p className="text-sm text-muted-foreground">{expenseCounts[category.id] || 0} expenses</p>
          </div>

          <div className="flex items-center gap-1">
            <Button
              aria-label={`Edit ${category.name}`}
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onEdit(category)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              aria-label={`Delete ${category.name}`}
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => onDeleteClick(category)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
