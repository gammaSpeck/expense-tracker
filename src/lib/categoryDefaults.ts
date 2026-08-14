import { CATEGORY_COLORS } from "@/db/expenseTrackerDb";
import { CategoryFormData } from "@/types/expense";

export function buildCategoryDefaultValues(category?: {
  id: string;
  name: string;
  icon: string;
  color: string;
}): CategoryFormData {
  return category
    ? {
        name: category.name,
        icon: category.icon,
        color: category.color,
      }
    : {
        name: "",
        icon: "Tag",
        color: CATEGORY_COLORS[Math.floor(Math.random() * CATEGORY_COLORS.length)],
      };
}
