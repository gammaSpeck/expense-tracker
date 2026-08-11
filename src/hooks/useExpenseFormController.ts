import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { getCurrentTime24 } from "@/lib/time";
import { ExpenseFormData, Expense } from "@/types/expense";
import { useCategories } from "@/hooks/useExpenseData";
import { addExpense, updateExpense } from "@/db/expenseTrackerDb";
import { toast } from "sonner";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useTagSuggestions } from "@/hooks/useTagSuggestions";
import { useDescriptionSuggestions } from "@/hooks/useDescriptionSuggestions";
import { useImageAttachment } from "@/hooks/useImageAttachment";

const expenseSchema = z.object({
  value: z
    .number({ error: "Amount is required" })
    .positive("Must be positive")
    .max(10000000, "Maximum 10,000,000")
    .nullable(), // Only default value can be null, user must input something
  category: z.string().min(1, "Category required"),
  description: z.string().optional(),
  tags: z.array(z.string()).max(4, "Maximum 4 tags"),
  date: z.string(),
  time: z.string(),
  isAdhoc: z.boolean(),
  attachment: z.string().optional(),
});

function initDefaults(expense?: Expense, duplicate?: Expense): ExpenseFormData {
  const now = new Date();
  const state = expense ??
    duplicate ?? {
      value: null,
      category: "",
      description: "",
      tags: [],
      date: format(now, "yyyy-MM-dd"),
      time: getCurrentTime24(),
      isAdhoc: false,
      attachment: undefined,
    };

  return {
    value: state.value,
    category: state.category,
    description: state.description || "",
    tags: state.tags,
    date: state.date,
    time: state.time,
    isAdhoc: state.isAdhoc,
    attachment: state.attachment,
  };
}

async function submitExpense(
  expense: Expense | undefined,
  formValues: ExpenseFormData,
  onSuccess?: () => void,
) {
  const { value, ...rest } = formValues;
  try {
    const data = { value: value || 0, ...rest }; // default to 0 if null for safety
    if (expense) {
      await updateExpense(expense.id, data);
      toast.success("Expense updated");
    } else {
      await addExpense(data);
      toast.success("Expense added");
    }
    onSuccess?.();
  } catch {
    toast.error("Failed to save expense");
  }
}

/** Defaults the category to "Others" once categories load, for new expenses only. */
function useDefaultCategoryEffect(
  expense: Expense | undefined,
  categories: { id: string; name: string }[],
  watch: (name: "category") => string,
  setValue: (name: "category", value: string) => void,
) {
  useEffect(() => {
    if (!expense && categories.length > 0 && !watch("category")) {
      const othersCategory = categories.find((c) => c.name === "Others");
      if (othersCategory) {
        setValue("category", othersCategory.id);
      }
    }
  }, [categories, expense, setValue, watch]);
}

/** Owns all ExpenseForm state and submit logic; the component only renders. */
export function useExpenseFormController(expense: Expense | undefined, duplicate: Expense | undefined, onSuccess?: () => void) {
  const categories = useCategories();
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const { currency } = useCurrency();

  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: initDefaults(expense, duplicate),
  });
  const { watch, setValue } = form;

  const tags = watch("tags");
  const description = watch("description");

  const tagState = useTagSuggestions(tags, description, setValue);
  const descriptionState = useDescriptionSuggestions(description);
  const imageState = useImageAttachment(setValue, expense?.attachment);

  const onSubmit = (formValues: ExpenseFormData) => submitExpense(expense, formValues, onSuccess);

  const handleCategoryCreated = (id: string) => {
    setValue("category", id);
    setShowCategoryDialog(false);
  };

  useDefaultCategoryEffect(expense, categories, watch, setValue);

  return {
    categories,
    currency,
    form,
    tags,
    description,
    showCategoryDialog,
    setShowCategoryDialog,
    tagState,
    descriptionState,
    imageState,
    onSubmit,
    handleCategoryCreated,
  };
}
