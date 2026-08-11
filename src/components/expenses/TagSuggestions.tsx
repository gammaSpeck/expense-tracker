interface TagSuggestionsProps {
  filteredSuggestions: string[];
  onAddTag: (tag: string) => void;
}

export function TagSuggestions({ filteredSuggestions, onAddTag }: TagSuggestionsProps) {
  if (!filteredSuggestions.length) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-2">
      {filteredSuggestions.slice(0, 5).map((tag) => (
        <button
          key={tag}
          type="button"
          onClick={() => onAddTag(tag)}
          className="px-2 py-1 text-xs bg-muted hover:bg-muted/80 rounded-full transition-colors"
        >
          {tag}
        </button>
      ))}
    </div>
  );
}
