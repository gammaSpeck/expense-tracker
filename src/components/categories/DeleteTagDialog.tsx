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

interface DeleteTagDialogProps {
  deleteData: { tag: string; count: number } | null;
  onOpenChange: () => void;
  onConfirm: () => void;
}

export function DeleteTagDialog({ deleteData, onOpenChange, onConfirm }: DeleteTagDialogProps) {
  return (
    <AlertDialog open={!!deleteData} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete "{deleteData?.tag}"?</AlertDialogTitle>
          <AlertDialogDescription>
            This tag is used in {deleteData?.count} expense
            {deleteData?.count !== 1 ? "s" : ""}. The tag will be removed from all expenses, but
            the expenses themselves will NOT be deleted.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-destructive hover:bg-destructive/90">
            Delete Tag
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
