import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import ExportDialog from "@/components/analysis/ExportDialog";

interface AnalysisExportSectionProps {
  showExportDialog: boolean;
  setShowExportDialog: (open: boolean) => void;
  onExportCSV: () => void;
  onExportJSON: () => void;
}

export function AnalysisExportSection({
  showExportDialog,
  setShowExportDialog,
  onExportCSV,
  onExportJSON,
}: AnalysisExportSectionProps) {
  return (
    <>
      <div
        className="animate-slide-in-up"
        style={{ animationDelay: "250ms", animationFillMode: "backwards" }}
      >
        <Button variant="outline" className="w-full" onClick={() => setShowExportDialog(true)}>
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      <ExportDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        onExportCSV={onExportCSV}
        onExportJSON={onExportJSON}
      />
    </>
  );
}
