import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TagChipList } from "@/components/expenses/TagChipList";
import { TagSuggestions } from "@/components/expenses/TagSuggestions";

interface TagInputFieldProps {
  tags: string[];
  tagInput: string;
  onTagInputChange: (value: string) => void;
  filteredSuggestions: string[];
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
}

export function TagInputField({
  tags,
  tagInput,
  onTagInputChange,
  filteredSuggestions,
  onAddTag,
  onRemoveTag,
}: TagInputFieldProps) {
  return (
    <div className="space-y-2">
      <Label>Tags (max 4)</Label>
      <TagChipList tags={tags} onRemoveTag={onRemoveTag} />

      {tags.length < 4 && (
        <div className="flex gap-2">
          <Input
            value={tagInput}
            onChange={(e) => onTagInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (tagInput.trim()) onAddTag(tagInput.trim());
              }
            }}
            placeholder="Add tag"
            className="flex-1 text-sm"
          />
          <Button
            aria-label="Add tag"
            type="button"
            variant="outline"
            size="icon"
            onClick={() => {
              if (tagInput.trim()) {
                onAddTag(tagInput.trim());
              }
            }}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      )}
      <TagSuggestions filteredSuggestions={filteredSuggestions} onAddTag={onAddTag} />
    </div>
  );
}
