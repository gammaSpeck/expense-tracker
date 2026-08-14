import { ArrowLeft, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeleteExpenseDialog } from "@/components/expenses/DeleteExpenseDialog";

interface EditExpenseHeaderProps {
  onBack: () => void;
  onDelete: () => void;
}

export function EditExpenseHeader({ onBack, onDelete }: EditExpenseHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" aria-label="Go back" onClick={onBack} className="h-9 w-9">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-semibold">Edit Expense</h1>
      </div>

      <DeleteExpenseDialog
        mode="trigger"
        trigger={
          <Button
            aria-label="Delete expense"
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-5 w-5" />
          </Button>
        }
        onConfirm={onDelete}
      />
    </div>
  );
}
