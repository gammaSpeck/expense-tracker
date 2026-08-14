import { Label } from "@/components/ui/label";
import { CategorySelectField } from "@/components/expenses/CategorySelectField";
import { Category } from "@/types/expense";

interface CategoryFieldGroupProps {
  categories: Category[];
  onCreateNew: () => void;
  errorMessage?: string;
}

export function CategoryFieldGroup({ categories, onCreateNew, errorMessage }: CategoryFieldGroupProps) {
  return (
    <div className="space-y-2">
      <Label>Category</Label>
      <CategorySelectField categories={categories} onCreateNew={onCreateNew} errorMessage={errorMessage} />
    </div>
  );
}
