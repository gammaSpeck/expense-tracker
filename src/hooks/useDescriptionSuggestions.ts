import { useEffect, useState } from "react";
import { getDescriptionSuggestions } from "@/db/expenseTrackerDb";

export function useDescriptionSuggestions(description: string | undefined) {
  const [descriptionSuggestions, setDescriptionSuggestions] = useState<string[]>([]);
  const [showDescriptionDropdown, setShowDescriptionDropdown] = useState(false);

  useEffect(() => {
    const descriptionValue = description || "";
    if (descriptionValue.length >= 2) {
      getDescriptionSuggestions(descriptionValue, 10).then((suggestions) => {
        setDescriptionSuggestions(suggestions);
        setShowDescriptionDropdown(suggestions.length > 0);
      });
    } else {
      setDescriptionSuggestions([]);
      setShowDescriptionDropdown(false);
    }
  }, [description]);

  return { descriptionSuggestions, showDescriptionDropdown, setShowDescriptionDropdown };
}
