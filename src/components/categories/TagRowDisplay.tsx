import { Edit2, Tag, Trash2 } from "lucide-react";
import type { TagMetadata } from "@/types/expense";

interface TagRowDisplayProps {
  tagData: TagMetadata;
  onTagClick: (tag: string) => void;
  onStartEdit: (tag: string) => void;
  onDeleteClick: (tag: string, count: number) => void;
}

export function TagRowDisplay({
  tagData,
  onTagClick,
  onStartEdit,
  onDeleteClick,
}: TagRowDisplayProps) {
  return (
    <div className="flex items-center gap-3">
      <button onClick={() => onTagClick(tagData.tag)} className="flex-1 text-left">
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-primary" />
          <span className="font-medium">{tagData.tag}</span>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Used in {tagData.count} expense
          {tagData.count !== 1 ? "s" : ""}
        </p>
      </button>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onStartEdit(tagData.tag)}
          className="p-2 hover:bg-muted rounded-lg transition-colors"
          aria-label="Rename tag"
        >
          <Edit2 className="h-4 w-4" />
        </button>
        <button
          onClick={() => onDeleteClick(tagData.tag, tagData.count)}
          className="p-2 hover:bg-destructive/10 text-destructive rounded-lg transition-colors"
          aria-label="Delete tag"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
