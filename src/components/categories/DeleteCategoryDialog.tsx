import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Category } from "@/types/expense";
import { DeleteActionOptions } from "@/components/categories/DeleteActionOptions";

interface DeleteCategoryDialogProps {
  deleteData: { category: Category; expenseCount: number } | null;
  onOpenChange: () => void;
  categories: Category[];
  deleteAction: "move" | "cascade";
  setDeleteAction: (action: "move" | "cascade") => void;
  moveToCategory: string;
  setMoveToCategory: (id: string) => void;
  onConfirm: () => void;
}

export function DeleteCategoryDialog({
  deleteData,
  onOpenChange,
  categories,
  deleteAction,
  setDeleteAction,
  moveToCategory,
  setMoveToCategory,
  onConfirm,
}: DeleteCategoryDialogProps) {
  return (
    <AlertDialog open={!!deleteData} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete "{deleteData?.category.name}"?</AlertDialogTitle>
          <AlertDialogDescription>
            {deleteData?.expenseCount ? (
              <>This category has {deleteData.expenseCount} expenses. What would you like to do?</>
            ) : (
              "This action cannot be undone."
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {deleteData && deleteData.expenseCount > 0 && (
          <DeleteActionOptions
            deleteData={deleteData}
            categories={categories}
            deleteAction={deleteAction}
            setDeleteAction={setDeleteAction}
            moveToCategory={moveToCategory}
            setMoveToCategory={setMoveToCategory}
          />
        )}

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive hover:bg-destructive/90"
            disabled={
              deleteAction === "move" && !!deleteData && deleteData.expenseCount > 0 && !moveToCategory
            }
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
