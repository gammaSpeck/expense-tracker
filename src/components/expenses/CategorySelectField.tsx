import { Controller, useFormContext } from "react-hook-form";
import { Plus } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CategoryIcon } from "@/components/categories/CategoryIcon";
import { ExpenseFormData } from "@/types/expense";
import { Category } from "@/types/expense";

interface CategorySelectFieldProps {
  categories: Category[];
  onCreateNew: () => void;
  errorMessage?: string;
}

export function CategorySelectField({ categories, onCreateNew, errorMessage }: CategorySelectFieldProps) {
  const { control } = useFormContext<ExpenseFormData>();

  return (
    <div className="space-y-2">
      <Controller
        control={control}
        name="category"
        render={({ field }) => {
          const selectedCategory = categories.find((c) => c.id === field.value);
          return (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger aria-label="Category">
                <SelectValue placeholder="Select category">
                  {selectedCategory && (
                    <div className="flex items-center gap-2">
                      <CategoryIcon icon={selectedCategory.icon} color={selectedCategory.color} size="sm" />
                      <span>{selectedCategory.name}</span>
                    </div>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    <div className="flex items-center gap-2">
                      <CategoryIcon icon={category.icon} color={category.color} size="sm" />
                      <span>{category.name}</span>
                    </div>
                  </SelectItem>
                ))}
                <div className="border-t border-border mt-1 pt-1">
                  <button
                    type="button"
                    onClick={onCreateNew}
                    className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-primary hover:bg-accent rounded"
                  >
                    <Plus className="h-4 w-4" />
                    Create New Category
                  </button>
                </div>
              </SelectContent>
            </Select>
          );
        }}
      />
      {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}
    </div>
  );
}
