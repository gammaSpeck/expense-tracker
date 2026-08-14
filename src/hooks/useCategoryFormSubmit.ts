import { toast } from "sonner";
import { addCategory, updateCategory, getCategoryByName } from "@/db/expenseTrackerDb";
import { CategoryFormData } from "@/types/expense";

export function useCategoryFormSubmit(
  category: { id: string; name: string; icon: string; color: string } | undefined,
  onSuccess?: (id: string) => void,
) {
  const onSubmit = async (data: CategoryFormData) => {
    try {
      // Check for duplicate name (only for new categories or name changes)
      if (!category || category.name !== data.name) {
        const existing = await getCategoryByName(data.name);
        if (existing) {
          toast.error("A category with this name already exists");
          return;
        }
      }

      let id: string;
      if (category) {
        await updateCategory(category.id, data);
        id = category.id;
        toast.success("Category updated");
      } else {
        id = await addCategory(data);
        toast.success("Category created");
      }
      onSuccess?.(id);
    } catch {
      toast.error("Failed to save category");
    }
  };

  return { onSubmit };
}
