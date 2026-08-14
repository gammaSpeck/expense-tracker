import { Input } from "@/components/ui/input";
import type { TagMetadata } from "@/types/expense";
import { TagRowDisplay } from "@/components/categories/TagRowDisplay";

interface TagRowProps {
  tagData: TagMetadata;
  isEditing: boolean;
  newName: string;
  onNewNameChange: (value: string) => void;
  onRenameSubmit: (tag: string) => void;
  onCancelEdit: () => void;
  onTagClick: (tag: string) => void;
  onStartEdit: (tag: string) => void;
  onDeleteClick: (tag: string, count: number) => void;
}

export function TagRow({
  tagData,
  isEditing,
  newName,
  onNewNameChange,
  onRenameSubmit,
  onCancelEdit,
  onTagClick,
  onStartEdit,
  onDeleteClick,
}: TagRowProps) {
  return (
    <div className="p-4 rounded-xl bg-card border border-border/50 hover:border-primary/20 transition-colors">
      {isEditing ? (
        <div className="flex items-center gap-2">
          <Input
            value={newName}
            onChange={(e) => onNewNameChange(e.target.value)}
            onBlur={() => onRenameSubmit(tagData.tag)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onRenameSubmit(tagData.tag);
              if (e.key === "Escape") onCancelEdit();
            }}
            className="flex-1"
            autoFocus
          />
        </div>
      ) : (
        <TagRowDisplay
          tagData={tagData}
          onTagClick={onTagClick}
          onStartEdit={onStartEdit}
          onDeleteClick={onDeleteClick}
        />
      )}
    </div>
  );
}
