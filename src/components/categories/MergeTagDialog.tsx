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

interface MergeTagDialogProps {
  mergeData: { from: string; into: string; count: number } | null;
  onOpenChange: () => void;
  onConfirm: () => void;
}

export function MergeTagDialog({ mergeData, onOpenChange, onConfirm }: MergeTagDialogProps) {
  const { from, into, count } = mergeData ?? { from: "", into: "", count: 0 };
  return (
    <AlertDialog open={!!mergeData} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Merge "{from}" into "{into}"?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {count} expense{count !== 1 ? "s" : ""} tagged "{from}" will be tagged "{into}" instead.
            This can't be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Merge</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
