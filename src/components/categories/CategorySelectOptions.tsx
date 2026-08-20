import { SelectItem, SelectValue } from "@/components/ui/select";
import { CategoryIcon } from "@/components/categories/CategoryIcon";
import type { Category } from "@/types/expense";

/** Shared with `SelectValue`'s children: the icon+name preview of the selected category, or
 *  nothing (falls back to the placeholder) when no category is selected yet. Extracted so the
 *  single-expense `CategorySelectField` and the bulk-add row select render identically. */
export function CategorySelectValue({
  category,
  placeholder,
}: {
  category: Category | undefined;
  placeholder: string;
}) {
  return (
    <SelectValue placeholder={placeholder}>
      {category && (
        <div className="flex items-center gap-2">
          <CategoryIcon icon={category.icon} color={category.color} size="sm" />
          <span>{category.name}</span>
        </div>
      )}
    </SelectValue>
  );
}

/** The `<SelectItem>` list shared by every category `<Select>` in the app. */
export function CategoryOptionItems({ categories }: { categories: Category[] }) {
  return (
    <>
      {categories.map((category) => (
        <SelectItem key={category.id} value={category.id}>
          <div className="flex items-center gap-2">
            <CategoryIcon icon={category.icon} color={category.color} size="sm" />
            <span>{category.name}</span>
          </div>
        </SelectItem>
      ))}
    </>
  );
}
