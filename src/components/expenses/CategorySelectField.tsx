import { Controller, useFormContext } from "react-hook-form";
import { Plus } from "lucide-react";
import { Select, SelectContent, SelectTrigger } from "@/components/ui/select";
import { CategorySelectValue, CategoryOptionItems } from "@/components/categories/CategorySelectOptions";
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
                <CategorySelectValue category={selectedCategory} placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <CategoryOptionItems categories={categories} />
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
