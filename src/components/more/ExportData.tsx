import { useState } from "react";
import { format } from "date-fns";
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
import { exportAllData } from "@/db/expenseTrackerDb";
import { Expense, Category } from "@/types/expense";
import { toast } from "sonner";

export function ExportData() {
  const [open, setOpen] = useState(false);
  const [formatType, setFormatType] = useState<"csv" | "json">("json");
  const [isExporting, setIsExporting] = useState(false);

  const resetForm = () => {
    setFormatType("json");
  };

  async function handleExport() {
    setIsExporting(true);
    try {
      const data = await exportAllData();
      const dateToken = format(new Date(), "yyyy-MM-dd");

      if (formatType === "csv") {
        const csv = generateCSV(data.expenses, data.categories);
        downloadFile(csv, `extrack-export-${dateToken}.csv`, "text/csv");
      } else {
        const json = JSON.stringify(
          {
            exportDate: new Date().toISOString(),
            version: "1.0",
            expenses: data.expenses,
            categories: data.categories,
          },
          null,
          2,
        );
        downloadFile(json, `extrack-export-${dateToken}.json`, "application/json");
      }

      toast.success(`Exported ${data.expenses.length} expenses`);
      resetForm();
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="outline" className="w-full justify-start">
        <Download className="h-4 w-4 mr-2" />
        Export Data
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Export Data</DialogTitle>
            <DialogDescription>
              Download all your expenses and categories as a file.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Format Selection */}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Format</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setFormatType("json")}
                  className={`py-2 rounded-lg transition-all ${
                    formatType === "json"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80"
                  }`}
                >
                  JSON
                </button>
                <button
                  onClick={() => setFormatType("csv")}
                  className={`py-2 rounded-lg transition-all ${
                    formatType === "csv"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80"
                  }`}
                >
                  CSV
                </button>
              </div>
            </div>

            <Button onClick={handleExport} disabled={isExporting} className="w-full">
              <Download className="h-4 w-4 mr-2" />
              {isExporting ? "Exporting..." : "Export Data"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function generateCSV(expenses: Expense[], categories: Category[]): string {
  const headers = [
    "Date",
    "Time",
    "Category",
    "Description",
    "Value",
    "Tags",
    "IsAdhoc",
    "Attachment",
  ];

  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

  const rows = expenses.map((e) => [
    e.date,
    e.time,
    categoryMap.get(e.category) || "Unknown",
    `"${(e.description || "").replace(/"/g, '""')}"`,
    e.value,
    `"${e.tags.join(";")}"`,
    e.isAdhoc,
    e.attachment ? "[base64]" : "",
  ]);

  return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
}

function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
