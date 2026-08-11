import { UseFormRegister, UseFormSetValue } from "react-hook-form";
import { ExpenseFormData } from "@/types/expense";
import { DescriptionField } from "@/components/expenses/DescriptionField";
import { TagInputField } from "@/components/expenses/TagInputField";
import { useDescriptionSuggestions } from "@/hooks/useDescriptionSuggestions";
import { useTagSuggestions } from "@/hooks/useTagSuggestions";

interface ExpenseTextFieldsProps {
  register: UseFormRegister<ExpenseFormData>;
  setValue: UseFormSetValue<ExpenseFormData>;
  description: string | undefined;
  descriptionState: ReturnType<typeof useDescriptionSuggestions>;
  tags: string[];
  tagState: ReturnType<typeof useTagSuggestions>;
}

/** Groups the free-text description and tag inputs, which share suggestion-dropdown wiring. */
export function ExpenseTextFields({
  register,
  setValue,
  description,
  descriptionState,
  tags,
  tagState,
}: ExpenseTextFieldsProps) {
  return (
    <>
      <DescriptionField
        register={register}
        setValue={setValue}
        description={description}
        descriptionSuggestions={descriptionState.descriptionSuggestions}
        showDescriptionDropdown={descriptionState.showDescriptionDropdown}
        setShowDescriptionDropdown={descriptionState.setShowDescriptionDropdown}
      />

      <TagInputField
        tags={tags}
        tagInput={tagState.tagInput}
        onTagInputChange={tagState.setTagInput}
        filteredSuggestions={tagState.filteredSuggestions}
        onAddTag={tagState.addTag}
        onRemoveTag={tagState.removeTag}
      />
    </>
  );
}
