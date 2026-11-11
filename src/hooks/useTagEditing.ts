import { useState } from "react";
import { toast } from "sonner";
import { renameTag } from "@/db/expenseTrackerDb";
import type { TagMetadata } from "@/types/expense";

export function useTagEditing(tags: TagMetadata[]) {
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [mergeData, setMergeData] = useState<{ from: string; into: string; count: number } | null>(
    null,
  );

  async function commitRename(from: string, into: string, message: string) {
    try {
      await renameTag(from, into);
      toast.success(message);
      cancelEditing();
    } catch {
      toast.error("Failed to rename tag");
    }
  }

  function handleRename(oldTag: string) {
    if (mergeData) return; // the dialog's focus steal blurs the input; ignore that re-submit
    const name = newName.trim();
    if (!name || name === oldTag) return cancelEditing();
    if (tags.some((t) => t.tag === name)) {
      const count = tags.find((t) => t.tag === oldTag)?.count ?? 0;
      return setMergeData({ from: oldTag, into: name, count });
    }
    void commitRename(oldTag, name, `Tag renamed to "${name}"`);
  }

  function confirmMerge() {
    if (!mergeData) return;
    const { from, into } = mergeData;
    setMergeData(null);
    void commitRename(from, into, `Merged "${from}" into "${into}"`);
  }

  function cancelMerge() {
    setMergeData(null);
    cancelEditing();
  }

  function startEditing(tag: string) {
    setEditingTag(tag);
    setNewName(tag);
  }

  function cancelEditing() {
    setEditingTag(null);
    setNewName("");
  }

  return {
    editingTag,
    newName,
    setNewName,
    handleRename,
    startEditing,
    cancelEditing,
    mergeData,
    confirmMerge,
    cancelMerge,
  };
}
