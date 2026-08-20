import { Switch } from "@/components/ui/switch";
import type { BulkDraftRow } from "@/db/bulkDraft";

export function RowAdhocToggle({
  row,
  onUpdate,
}: {
  row: BulkDraftRow;
  onUpdate: (patch: Partial<BulkDraftRow>) => void;
}) {
  return (
    <label className="flex items-center gap-1.5 ml-auto">
      adhoc
      <Switch
        aria-label="adhoc"
        checked={row.isAdhoc}
        onCheckedChange={(v) => onUpdate({ isAdhoc: v })}
      />
    </label>
  );
}
