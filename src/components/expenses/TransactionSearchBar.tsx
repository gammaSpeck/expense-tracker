import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";

interface TransactionSearchBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  resultCount: number;
}

export function TransactionSearchBar({ search, onSearchChange, resultCount }: TransactionSearchBarProps) {
  return (
    <div
      className="sticky top-0 z-20 bg-background/95 backdrop-blur-xs -mx-4 px-4 py-2 animate-slide-in-up"
      style={{ animationDelay: "50ms", animationFillMode: "backwards" }}
    >
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search transactions..."
          className="pl-10 pr-10"
        />
        {search && (
          <button
            onClick={() => onSearchChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>
      {resultCount > 0 && (
        <p className="text-xs text-muted-foreground mt-2">
          Showing {resultCount} transaction
          {resultCount !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
