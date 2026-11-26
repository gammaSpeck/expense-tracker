import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { FormatToggle } from "@/components/more/export/FormatToggle";

interface ExportDialogContentProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formatType: "csv" | "json";
  setFormatType: (format: "csv" | "json") => void;
  isExporting: boolean;
  onExportClick: () => void;
}

export function ExportDialogContent({
  open,
  onOpenChange,
  formatType,
  setFormatType,
  isExporting,
  onExportClick,
}: ExportDialogContentProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-left">
          <DialogTitle>Export Data</DialogTitle>
          <DialogDescription>
            Download all your expenses and categories as a file.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Format</Label>
            <FormatToggle formatType={formatType} onChange={setFormatType} />
          </div>

          <Button onClick={onExportClick} disabled={isExporting} className="w-full">
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? "Exporting..." : "Export Data"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
