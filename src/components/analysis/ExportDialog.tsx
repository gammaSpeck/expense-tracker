import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExportCSV: () => Promise<void> | void;
  onExportJSON: () => Promise<void> | void;
};

export default function ExportDialog({ open, onOpenChange, onExportCSV, onExportJSON }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export Data</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <Button
            variant="outline"
            className="w-full justify-start h-auto py-4"
            onClick={onExportCSV}
          >
            <div className="text-left">
              <p className="font-medium">Export as CSV</p>
              <p className="text-xs text-muted-foreground">Compatible with Excel, Google Sheets</p>
            </div>
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start h-auto py-4"
            onClick={onExportJSON}
          >
            <div className="text-left">
              <p className="font-medium">Export as JSON</p>
              <p className="text-xs text-muted-foreground">Full data backup with all fields</p>
            </div>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
