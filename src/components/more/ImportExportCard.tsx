import { useNavigate } from "react-router";
import { FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExportData } from "@/components/more/ExportData";
import { ImportData } from "@/components/more/ImportData";

export function ImportExportCard() {
  const navigate = useNavigate();

  return (
    <div className="p-4 rounded-xl bg-card border border-border/50 space-y-4">
      <h2 className="text-sm font-semibold">Import & Export</h2>

      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">
          Export your data as JSON or CSV. Does not affect backup reminders.
        </p>
        <ExportData />
      </div>

      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">
          Restore from an encrypted .extrack backup file. Choose merge or override mode.
        </p>
        <ImportData />
      </div>

      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">
          Import expenses from any app that exports CSV. Map columns and categories before committing.
        </p>
        <Button
          variant="outline"
          className="w-full justify-start"
          data-testid="csv-import-entry"
          onClick={() => navigate("/settings/data/import-csv")}
        >
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Import from CSV
        </Button>
      </div>
    </div>
  );
}
