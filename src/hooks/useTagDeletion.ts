import { useState } from "react";
import { toast } from "sonner";
import { deleteTag } from "@/db/expenseTrackerDb";

export function useTagDeletion() {
  const [deleteData, setDeleteData] = useState<{ tag: string; count: number } | null>(null);

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

  return {
    deleteData,
    setDeleteData,
    clearDeleteData: () => setDeleteData(null),
    handleDelete,
  };
}
