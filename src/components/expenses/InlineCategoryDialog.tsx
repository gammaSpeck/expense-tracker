import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CategoryForm } from "@/components/categories/CategoryForm";

interface InlineCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (id: string) => void;
}

export function InlineCategoryDialog({ open, onOpenChange, onCreated }: InlineCategoryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Category</DialogTitle>
        </DialogHeader>
        <CategoryForm onSuccess={onCreated} onCancel={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
