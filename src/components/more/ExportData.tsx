import { useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { exportAllData } from "@/lib/db";
import { Expense, Category } from "@/types/expense";
import { toast } from "sonner";

export function ExportData() {
  const [open, setOpen] = useState(false);
  const [formatType, setFormatType] = useState<"csv" | "json">("csv");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  const resetForm = () => {
    setFormatType("csv");
    setFromDate("");
    setToDate("");
  };

  async function handleExport() {
    setIsExporting(true);
    try {
      const data = await exportAllData();

      let expenses = data.expenses;
      if (fromDate && toDate) {
        expenses = expenses.filter(
          (e) => e.date >= fromDate && e.date <= toDate
        );
      }

      if (formatType === "csv") {
        const csv = generateCSV(expenses, data.categories);
        downloadFile(csv, `expenses-${Date.now()}.csv`, "text/csv");
      } else {
        const json = JSON.stringify(
          {
            exportDate: new Date().toISOString(),
            version: "1.0",
            expenses,
            categories: data.categories,
          },
          null,
          2
        );
        downloadFile(json, `expenses-${Date.now()}.json`, "application/json");
      }

      toast.success(`Exported ${expenses.length} expenses`);
      resetForm();
      setOpen(false);
    } catch (error) {
      toast.error("Export failed");
    } finally {
      setIsExporting(false);
    }
  }

  const clearDates = () => {
    setFromDate("");
    setToDate("");
  };

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        variant="outline"
        className="w-full justify-start"
      >
        <Download className="h-4 w-4 mr-2" />
        Export Data
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Export Data</DialogTitle>
            <DialogDescription>
              Export your expenses and categories. By default, all expenses will
              be exported.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Date Range Filter */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm text-muted-foreground">
                  Date Range (Optional)
                </Label>
                {(fromDate || toDate) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearDates}
                    className="h-6 text-xs"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Clear
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  placeholder="From"
                />
                <Input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  placeholder="To"
                />
              </div>
            </div>

            {/* Format Selection */}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Format</Label>
              <div className="grid grid-cols-2 gap-2">
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
              </div>
            </div>

            {/* Export Button */}
            <Button
              onClick={handleExport}
              disabled={isExporting}
              className="w-full"
            >
              <Download className="h-4 w-4 mr-2" />
              {isExporting ? "Exporting..." : "Export"}
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
