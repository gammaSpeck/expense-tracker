import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CategoryForm } from "@/components/categories/CategoryForm";
import { Category } from "@/types/expense";

interface CategoryFormDialogsProps {
  showCreateDialog: boolean;
  setShowCreateDialog: (open: boolean) => void;
  editCategory: Category | null;
  setEditCategory: (category: Category | null) => void;
}

export function CategoryFormDialogs({
  showCreateDialog,
  setShowCreateDialog,
  editCategory,
  setEditCategory,
}: CategoryFormDialogsProps) {
  return (
    <>
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Category</DialogTitle>
          </DialogHeader>
          <CategoryForm
            onSuccess={() => setShowCreateDialog(false)}
            onCancel={() => setShowCreateDialog(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editCategory} onOpenChange={() => setEditCategory(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
          </DialogHeader>
          {editCategory && (
            <CategoryForm
              category={editCategory}
              onSuccess={() => setEditCategory(null)}
              onCancel={() => setEditCategory(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
