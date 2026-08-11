import { useEffect, useState } from "react";
import type { UseFormSetValue } from "react-hook-form";
import { getTagSuggestions } from "@/db/expenseTrackerDb";
import { ExpenseFormData } from "@/types/expense";

/**
 * `tags` must be the raw `watch("tags")` value from the caller, re-derived
 * fresh every render — memoising it upstream would stale the filtered list.
 */
export function useTagSuggestions(
  tags: string[],
  description: string | undefined,
  setValue: UseFormSetValue<ExpenseFormData>,
) {
  const [tagInput, setTagInput] = useState("");
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);

  useEffect(() => {
    getTagSuggestions().then(setTagSuggestions);
  }, []);

  const filteredSuggestions = tagSuggestions.filter(
    (tag) =>
      !tags.includes(tag) &&
      (tag.toLowerCase().includes(tagInput.toLowerCase()) ||
        (description && tag.toLowerCase().includes(description.toLowerCase()))),
  );

  const addTag = (tag: string) => {
    if (tags.length < 4 && !tags.includes(tag)) setValue("tags", [...tags, tag]);
    setTagInput("");
  };

  const removeTag = (tag: string) => {
    setValue(
      "tags",
      tags.filter((t) => t !== tag),
    );
  };

  return { tagInput, setTagInput, filteredSuggestions, addTag, removeTag };
}
