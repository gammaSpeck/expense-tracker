import { useState } from "react";
import { toast } from "sonner";
import { deleteCategory } from "@/db/expenseTrackerDb";
import { Category } from "@/types/expense";

export function useCategoryDeletion(categories: Category[], expenseCounts: Record<string, number>) {
  const [deleteData, setDeleteData] = useState<{
    category: Category;
    expenseCount: number;
  } | null>(null);
  const [deleteAction, setDeleteAction] = useState<"move" | "cascade">("move");
  const [moveToCategory, setMoveToCategory] = useState<string>("");

  const clearDeleteData = () => setDeleteData(null);

  const handleDelete = async () => {
    if (!deleteData) return;

    try {
      if (deleteAction === "move") {
        await deleteCategory(deleteData.category.id, moveToCategory);
      } else {
        await deleteCategory(deleteData.category.id);
      }
      toast.success("Category deleted");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to delete category");
    }
    setDeleteData(null);
  };

  const handleDeleteClick = async (category: Category) => {
    // Check if it's the "Others" category
    if (category.name === "Others" && category.isDefault) {
      toast.error('The "Others" category cannot be deleted');
      return;
    }

    const count = expenseCounts[category.id] || 0;
    const othersCategory = categories.find((c) => c.name === "Others");
    setMoveToCategory(othersCategory?.id || "");
    setDeleteData({ category, expenseCount: count });
  };

  return {
    deleteData,
    clearDeleteData,
    deleteAction,
    setDeleteAction,
    moveToCategory,
    setMoveToCategory,
    handleDelete,
    handleDeleteClick,
  };
}
