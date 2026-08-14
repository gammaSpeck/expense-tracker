import type { UseFormRegister, UseFormSetValue } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ExpenseFormData } from "@/types/expense";

interface DescriptionFieldProps {
  register: UseFormRegister<ExpenseFormData>;
  setValue: UseFormSetValue<ExpenseFormData>;
  description: string | undefined;
  descriptionSuggestions: string[];
  showDescriptionDropdown: boolean;
  setShowDescriptionDropdown: (show: boolean) => void;
}

export function DescriptionField({
  register,
  setValue,
  description,
  descriptionSuggestions,
  showDescriptionDropdown,
  setShowDescriptionDropdown,
}: DescriptionFieldProps) {
  return (
    <div className="space-y-2 relative">
      <Label htmlFor="description">Description (optional)</Label>
      <Textarea
        id="description"
        placeholder="What was this expense for?"
        className="resize-none text-sm"
        rows={2}
        {...register("description")}
        onFocus={() => {
          if (description && description.length >= 2 && descriptionSuggestions.length > 0) {
            setShowDescriptionDropdown(true);
          }
        }}
        onBlur={() => {
          // Delay to allow click on suggestion
          setTimeout(() => setShowDescriptionDropdown(false), 200);
        }}
      />
      {showDescriptionDropdown && descriptionSuggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {descriptionSuggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              onClick={() => {
                setValue("description", suggestion);
                setShowDescriptionDropdown(false);
              }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors first:rounded-t-lg last:rounded-b-lg"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
