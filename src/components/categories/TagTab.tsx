import { useState } from "react";
import { useTags } from "@/hooks/useExpenseData";
import { deleteTag, renameTag } from "@/db/expenseTrackerDb";
import { Trash2, Edit2, Tag } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function TagTab() {
  const tags = useTags();
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [deleteData, setDeleteData] = useState<{
    tag: string;
    count: number;
  } | null>(null);
  const navigate = useNavigate();

  async function handleDelete() {
    if (!deleteData) return;

    try {
      await deleteTag(deleteData.tag);
      toast.success(`Tag "${deleteData.tag}" deleted`);
      setDeleteData(null);
    } catch {
      toast.error("Failed to delete tag");
    }
  }

  async function handleRename(oldTag: string) {
    if (!newName || newName === oldTag) {
      setEditingTag(null);
      setNewName("");
      return;
    }

    try {
      await renameTag(oldTag, newName);
      toast.success(`Tag renamed to "${newName}"`);
      setEditingTag(null);
      setNewName("");
    } catch {
      toast.error("Failed to rename tag");
    }
  }

  function handleTagClick(tag: string) {
    navigate("/transactions", { state: { filterTag: tag } });
  }

  if (tags.length === 0) {
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

  return (
    <>
      <div className="space-y-2">
        {tags.map((tagData) => (
          <div
            key={tagData.tag}
            className="p-4 rounded-xl bg-card border border-border/50 hover:border-primary/20 transition-colors"
          >
            {editingTag === tagData.tag ? (
              <div className="flex items-center gap-2">
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onBlur={() => handleRename(tagData.tag)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRename(tagData.tag);
                    if (e.key === "Escape") {
                      setEditingTag(null);
                      setNewName("");
                    }
                  }}
                  className="flex-1"
                  autoFocus
                />
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <button onClick={() => handleTagClick(tagData.tag)} className="flex-1 text-left">
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
                    onClick={() => {
                      setEditingTag(tagData.tag);
                      setNewName(tagData.tag);
                    }}
                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                    aria-label="Rename tag"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setDeleteData({ tag: tagData.tag, count: tagData.count })}
                    className="p-2 hover:bg-destructive/10 text-destructive rounded-lg transition-colors"
                    aria-label="Delete tag"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <AlertDialog open={!!deleteData} onOpenChange={() => setDeleteData(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteData?.tag}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This tag is used in {deleteData?.count} expense
              {deleteData?.count !== 1 ? "s" : ""}. The tag will be removed from all expenses, but
              the expenses themselves will NOT be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete Tag
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
