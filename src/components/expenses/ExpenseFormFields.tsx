import { Expense } from "@/types/expense";
import { CategoryFieldGroup } from "@/components/expenses/CategoryFieldGroup";
import { ExpenseTextFields } from "@/components/expenses/ExpenseTextFields";
import { DateTimeFields } from "@/components/expenses/DateTimeFields";
import { AttachmentField } from "@/components/expenses/AttachmentField";
import { AmountField } from "@/components/expenses/AmountField";
import { AdhocToggleField } from "@/components/expenses/AdhocToggleField";
import { ExpenseFormActions } from "@/components/expenses/ExpenseFormActions";
import { useExpenseFormController } from "@/hooks/useExpenseFormController";

type Controller = ReturnType<typeof useExpenseFormController>;

interface ExpenseFormFieldsProps {
  expense?: Expense;
  onCancel?: () => void;
  currencySymbol: string;
  controller: Controller;
}

export function ExpenseFormFields({ expense, onCancel, currencySymbol, controller }: ExpenseFormFieldsProps) {
  const {
    categories,
    form,
    tags,
    description,
    setShowCategoryDialog,
    tagState,
    descriptionState,
    imageState,
    onSubmit,
  } = controller;
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = form;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <AmountField currencySymbol={currencySymbol} register={register} errorMessage={errors.value?.message} />

      <CategoryFieldGroup
        categories={categories}
        onCreateNew={() => setShowCategoryDialog(true)}
        errorMessage={errors.category?.message}
      />

      <ExpenseTextFields
        register={register}
        setValue={setValue}
        description={description}
        descriptionState={descriptionState}
        tags={tags}
        tagState={tagState}
      />

      <DateTimeFields />

      <AdhocToggleField control={control} />

      <AttachmentField
        imagePreview={imageState.imagePreview}
        onUpload={imageState.handleImageUpload}
        onRemove={imageState.removeImage}
      />

      <ExpenseFormActions isEdit={!!expense} isSubmitting={isSubmitting} onCancel={onCancel} />
    </form>
  );
}
