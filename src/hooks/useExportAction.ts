import { useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { exportAllData } from "@/db/expenseTrackerDb";
import { downloadFile } from "@/lib/download";
import { formatExportContent } from "@/lib/exportData";
import { captureError } from "@/lib/telemetry";

type ExportFormat = "csv" | "json";

/** Owns the export-to-file workflow: generate content, download. */
export function useExportAction(formatType: ExportFormat, onDone: () => void) {
  const [isExporting, setIsExporting] = useState(false);

  async function handleExport() {
    setIsExporting(true);
    try {
      const data = await exportAllData();
      const dateToken = format(new Date(), "yyyy-MM-dd");
      const { content, filename, mimeType } = formatExportContent(data, formatType, dateToken);
      downloadFile(content, filename, mimeType);

      toast.success(`Exported ${data.expenses.length} expenses`);
      onDone();
    } catch (err) {
      captureError("export_failed", err, { format: formatType });
      toast.error(err instanceof Error ? err.message : "Export failed");
    } finally {
      setIsExporting(false);
    }
  }

  return { isExporting, handleExport };
}
