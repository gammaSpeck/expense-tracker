export function RowSuggestionsDropdown({
  show,
  suggestions,
  onSelect,
}: {
  show: boolean;
  suggestions: string[];
  onSelect: (value: string) => void;
}) {
  if (!show) return null;
  return (
    <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
      {suggestions.map((suggestion) => (
        <button
          key={suggestion}
          type="button"
          onClick={() => onSelect(suggestion)}
          className="w-full text-left px-3 py-2 text-sm hover:bg-accent"
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
}
