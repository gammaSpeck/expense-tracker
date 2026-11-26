import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useExportAction } from "@/hooks/useExportAction";
import { ExportDialogContent } from "@/components/more/export/ExportDialogContent";

export function ExportData() {
  const [open, setOpen] = useState(false);
  const [formatType, setFormatType] = useState<"csv" | "json">("json");
  const { isExporting, handleExport } = useExportAction(formatType, () => {
    setFormatType("json");
    setOpen(false);
  });

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="outline" className="w-full justify-start">
        <Download className="h-4 w-4 mr-2" />
        Export Data
      </Button>

      <ExportDialogContent
        open={open}
        onOpenChange={setOpen}
        formatType={formatType}
        setFormatType={setFormatType}
        isExporting={isExporting}
        onExportClick={handleExport}
      />
    </>
  );
}
