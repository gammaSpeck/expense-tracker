import { Button } from "@/components/ui/button";

interface ExpenseFormActionsProps {
  isEdit: boolean;
  isSubmitting: boolean;
  onCancel?: () => void;
}

export function ExpenseFormActions({ isEdit, isSubmitting, onCancel }: ExpenseFormActionsProps) {
  return (
    <div className="flex gap-3 pt-4">
      {onCancel && (
        <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
          Cancel
        </Button>
      )}
      <Button type="submit" className="flex-1" disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : isEdit ? "Update" : "Save"}
      </Button>
    </div>
  );
}
