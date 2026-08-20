import { Link } from "react-router";
import { Button } from "@/components/ui/button";

const SCALE_HINT_THRESHOLD = 100;

export function ScaleHint({ totalRowCount }: { totalRowCount: number }) {
  if (totalRowCount <= SCALE_HINT_THRESHOLD) return null;
  return (
    <p className="text-xs text-muted-foreground">
      That's a lot of rows —{" "}
      <Link to="/settings/data/import-csv" className="underline">
        CSV import
      </Link>{" "}
      is faster for big backfills.
    </p>
  );
}

export function BulkFooter({
  entryCount,
  grandTotal,
  formatValue,
  onSave,
  disabled,
}: {
  entryCount: number;
  grandTotal: number;
  formatValue: (value: number) => string;
  onSave: () => void;
  disabled: boolean;
}) {
  return (
    <div className="fixed bottom-16 inset-x-0 lg:bottom-0 border-t border-border bg-background/95 backdrop-blur p-3 flex items-center justify-between gap-3 z-60">
      <span className="text-sm text-muted-foreground">
        {entryCount} {entryCount === 1 ? "entry" : "entries"} · {formatValue(grandTotal)}
      </span>
      <Button type="button" onClick={onSave} disabled={disabled}>
        Save all
      </Button>
    </div>
  );
}
