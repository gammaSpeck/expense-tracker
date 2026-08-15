import type { DraftExpense } from "@/types/csvImport";

export interface PreviewRow {
  draft: DraftExpense;
  categoryName: string;
}

interface CsvPreviewTableProps {
  rows: PreviewRow[];
}

/** Plain preview table, extracted so CsvPreviewStep stays inside the complexity ceiling. */
export function CsvPreviewTable({ rows }: CsvPreviewTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-muted-foreground">
            <th className="pr-2 py-1">Date</th>
            <th className="pr-2 py-1">Time</th>
            <th className="pr-2 py-1">Amount</th>
            <th className="pr-2 py-1">Category</th>
            <th className="pr-2 py-1">Description</th>
            <th className="pr-2 py-1">Tags</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={6} className="text-center text-xs text-muted-foreground py-6">
                No matching rows in preview
              </td>
            </tr>
          ) : (
            rows.map(({ draft, categoryName }, i) => (
              <tr key={i} data-testid="csv-preview-row" className="border-t border-border/50">
                <td className="pr-2 py-1">{draft.date}</td>
                <td className="pr-2 py-1">{draft.time}</td>
                <td className="pr-2 py-1">{draft.value}</td>
                <td className="pr-2 py-1">{categoryName}</td>
                <td className="pr-2 py-1 max-w-[120px] truncate">{draft.description ?? "—"}</td>
                <td className="pr-2 py-1">{draft.tags.length > 0 ? draft.tags.join(", ") : "—"}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
