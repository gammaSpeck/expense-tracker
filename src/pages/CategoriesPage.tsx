import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeleteCategoryDialog } from "@/components/categories/DeleteCategoryDialog";
import { CategoryFormDialogs } from "@/components/categories/CategoryFormDialogs";
import { CategoryTabs } from "@/components/categories/CategoryTabs";
import { useCategories, useCategoryExpenseCounts } from "@/hooks/useExpenseData";
import { useCategoryDeletion } from "@/hooks/useCategoryDeletion";
import { Category } from "@/types/expense";

export default function CategoriesPage() {
  const categories = useCategories();
  const expenseCounts = useCategoryExpenseCounts();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editCategory, setEditCategory] = useState<Category | null>(null);
  const {
    deleteData,
    clearDeleteData,
    deleteAction,
    setDeleteAction,
    moveToCategory,
    setMoveToCategory,
    handleDelete,
    handleDeleteClick,
  } = useCategoryDeletion(categories, expenseCounts);

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between animate-slide-in-up">
        <h1 className="text-xl font-semibold">Categories</h1>
        <Button onClick={() => setShowCreateDialog(true)} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add Category
        </Button>
      </div>

      <CategoryTabs
        categories={categories}
        expenseCounts={expenseCounts}
        onEdit={setEditCategory}
        onDeleteClick={handleDeleteClick}
      />

      <CategoryFormDialogs
        showCreateDialog={showCreateDialog}
        setShowCreateDialog={setShowCreateDialog}
        editCategory={editCategory}
        setEditCategory={setEditCategory}
      />

      {/* Delete Dialog */}
      <DeleteCategoryDialog
        deleteData={deleteData}
        onOpenChange={clearDeleteData}
        categories={categories}
        deleteAction={deleteAction}
        setDeleteAction={setDeleteAction}
        moveToCategory={moveToCategory}
        setMoveToCategory={setMoveToCategory}
        onConfirm={handleDelete}
      />
    </div>
  );
}
