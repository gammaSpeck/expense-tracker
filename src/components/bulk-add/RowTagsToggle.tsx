import { useState } from "react";
import type { KeyboardEvent } from "react";
import { Input } from "@/components/ui/input";
import { canAddTag, filterTags } from "@/lib/bulkAddDraft";
import { RowSuggestionsDropdown } from "@/components/bulk-add/RowSuggestions";
import type { BulkDraftRow } from "@/db/bulkDraft";

export function RowTagsToggle({
  row,
  allTags,
  onUpdate,
}: {
  row: BulkDraftRow;
  allTags: string[];
  onUpdate: (patch: Partial<BulkDraftRow>) => void;
}) {
  const [tagsOpen, setTagsOpen] = useState(row.tags.length > 0);
  const [tagInput, setTagInput] = useState("");
  const [focused, setFocused] = useState(false);
  const suggestions = focused ? filterTags(allTags, tagInput, row.tags) : [];

  const addTag = (value: string) => {
    if (!canAddTag(row.tags, value)) return;
    onUpdate({ tags: [...row.tags, value] });
    setTagInput("");
  };

  const handleTagKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    addTag(tagInput.trim());
  };

  if (!tagsOpen) {
    return (
      <button type="button" onClick={() => setTagsOpen(true)}>
        + tag
      </button>
    );
  }
  return (
    <div className="relative">
      <Input
        aria-label="Add tag"
        placeholder="Add tag"
        value={tagInput}
        onChange={(e) => setTagInput(e.target.value)}
        onKeyDown={handleTagKey}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        className="h-7 w-24 text-xs"
      />
      <RowSuggestionsDropdown
        show={suggestions.length > 0}
        suggestions={suggestions}
        onSelect={addTag}
      />
    </div>
  );
}
