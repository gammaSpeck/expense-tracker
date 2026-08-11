import { useNavigate } from "react-router";
import { useTags } from "@/hooks/useExpenseData";
import { useTagEditing } from "@/hooks/useTagEditing";
import { useTagDeletion } from "@/hooks/useTagDeletion";
import { TagRow } from "@/components/categories/TagRow";
import { EmptyTagState } from "@/components/categories/EmptyTagState";
import { DeleteTagDialog } from "@/components/categories/DeleteTagDialog";

export function TagTab() {
  const tags = useTags();
  const navigate = useNavigate();
  const { editingTag, newName, setNewName, handleRename, startEditing, cancelEditing } =
    useTagEditing();
  const { deleteData, setDeleteData, clearDeleteData, handleDelete } = useTagDeletion();

  function handleTagClick(tag: string) {
    navigate("/transactions", { state: { filterTag: tag } });
  }

  if (tags.length === 0) {
    return <EmptyTagState />;
  }

  return (
    <>
      <div className="space-y-2">
        {tags.map((tagData) => (
          <TagRow
            key={tagData.tag}
            tagData={tagData}
            isEditing={editingTag === tagData.tag}
            newName={newName}
            onNewNameChange={setNewName}
            onRenameSubmit={handleRename}
            onCancelEdit={cancelEditing}
            onTagClick={handleTagClick}
            onStartEdit={startEditing}
            onDeleteClick={(tag, count) => setDeleteData({ tag, count })}
          />
        ))}
      </div>

      <DeleteTagDialog deleteData={deleteData} onOpenChange={clearDeleteData} onConfirm={handleDelete} />
    </>
  );
}
