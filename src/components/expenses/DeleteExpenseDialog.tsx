import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type DeleteExpenseDialogProps =
  | { mode: "controlled"; open: boolean; onOpenChange: (open: boolean) => void; onConfirm: () => void }
  | { mode: "trigger"; trigger: React.ReactNode; onConfirm: () => void };

export function DeleteExpenseDialog(props: DeleteExpenseDialogProps) {
  const body = (
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Delete Expense?</AlertDialogTitle>
        <AlertDialogDescription>
          Are you sure you want to delete this expense? This action cannot be undone.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction
          onClick={props.onConfirm}
          className="bg-destructive hover:bg-destructive/90"
        >
          Delete
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  );

  if (props.mode === "trigger") {
    return (
      <AlertDialog>
        <AlertDialogTrigger asChild>{props.trigger}</AlertDialogTrigger>
        {body}
      </AlertDialog>
    );
  }

  return (
    <AlertDialog open={props.open} onOpenChange={props.onOpenChange}>
      {body}
    </AlertDialog>
  );
}
