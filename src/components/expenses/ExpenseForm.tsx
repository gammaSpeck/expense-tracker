import { FormProvider } from "react-hook-form";
import { Expense } from "@/types/expense";
import { useExpenseFormController } from "@/hooks/useExpenseFormController";
import { InlineCategoryDialog } from "@/components/expenses/InlineCategoryDialog";
import { ExpenseFormFields } from "@/components/expenses/ExpenseFormFields";

interface ExpenseFormProps {
  expense?: Expense;
  duplicate?: Expense;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ExpenseForm({ expense, duplicate, onSuccess, onCancel }: ExpenseFormProps) {
  const controller = useExpenseFormController(expense, duplicate, onSuccess);
  const { currency, showCategoryDialog, setShowCategoryDialog, handleCategoryCreated, form } = controller;

  return (
    <>
      <FormProvider {...form}>
        <ExpenseFormFields
          expense={expense}
          onCancel={onCancel}
          currencySymbol={currency.symbol}
          controller={controller}
        />
      </FormProvider>

      <InlineCategoryDialog
        open={showCategoryDialog}
        onOpenChange={setShowCategoryDialog}
        onCreated={handleCategoryCreated}
      />
    </>
  );
}
