import { useState } from "react";
import { toast } from "sonner";
import { renameTag } from "@/db/expenseTrackerDb";

export function useTagEditing() {
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [newName, setNewName] = useState("");

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

  function startEditing(tag: string) {
    setEditingTag(tag);
    setNewName(tag);
  }

  function cancelEditing() {
    setEditingTag(null);
    setNewName("");
  }

  return { editingTag, newName, setNewName, handleRename, startEditing, cancelEditing };
}
