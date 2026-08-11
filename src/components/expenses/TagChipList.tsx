import { X } from "lucide-react";

interface TagChipListProps {
  tags: string[];
  onRemoveTag: (tag: string) => void;
}

export function TagChipList({ tags, onRemoveTag }: TagChipListProps) {
  if (!tags.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mb-2">
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-primary/10 text-primary rounded-full text-xs"
        >
          {tag}
          <button
            aria-label={`Remove tag ${tag}`}
            type="button"
            onClick={() => onRemoveTag(tag)}
            className="hover:bg-primary/20 rounded-full p-0.5"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </span>
      ))}
    </div>
  );
}
