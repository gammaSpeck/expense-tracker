interface FormatToggleProps {
  formatType: "csv" | "json";
  onChange: (formatType: "csv" | "json") => void;
}

export function FormatToggle({ formatType, onChange }: FormatToggleProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <button
        onClick={() => onChange("json")}
        className={`py-2 rounded-lg transition-all ${
          formatType === "json" ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"
        }`}
      >
        JSON
      </button>
      <button
        onClick={() => onChange("csv")}
        className={`py-2 rounded-lg transition-all ${
          formatType === "csv" ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"
        }`}
      >
        CSV
      </button>
    </div>
  );
}
