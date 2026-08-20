import { useState } from "react";
import type { KeyboardEvent } from "react";
import { Input } from "@/components/ui/input";
import { filterDescriptions } from "@/lib/bulkAddDraft";
import { RowSuggestionsDropdown } from "@/components/bulk-add/RowSuggestions";

interface RowDescriptionFieldProps {
  value: string;
  allDescriptions: string[];
  onChange: (value: string) => void;
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
}

export function RowDescriptionField({
  value,
  allDescriptions,
  onChange,
  onKeyDown,
}: RowDescriptionFieldProps) {
  const [focused, setFocused] = useState(false);
  const suggestions = focused ? filterDescriptions(allDescriptions, value) : [];

  const selectSuggestion = (suggestion: string) => {
    onChange(suggestion);
    setFocused(false);
  };

  return (
    <div className="relative">
      <Input
        aria-label="Description"
        placeholder="Description"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
      />
      <RowSuggestionsDropdown
        show={focused && suggestions.length > 0}
        suggestions={suggestions}
        onSelect={selectSuggestion}
      />
    </div>
  );
}
