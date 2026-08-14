import { Tag } from "lucide-react";

export function EmptyTagState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Tag className="h-12 w-12 text-muted-foreground mb-4" />
      <p className="font-medium">No tags created yet</p>
      <p className="text-sm text-muted-foreground mt-1">
        Tags are automatically created when you add them to expenses
      </p>
    </div>
  );
}
