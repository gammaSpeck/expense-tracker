import { useState } from "react";
import { Download, CalendarIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { exportAllData, getAllCategories } from "@/lib/db";
import { Expense, Category } from "@/types/expense";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export function ExportData() {
  const [open, setOpen] = useState(false);
  const [formatType, setFormatType] = useState<"csv" | "json">("csv");
  const [fromDate, setFromDate] = useState<Date | undefined>();
  const [toDate, setToDate] = useState<Date | undefined>();
  const [isExporting, setIsExporting] = useState(false);

  const resetForm = () => {
    setFormatType("csv");
    setFromDate(undefined);
    setToDate(undefined);
  };

  async function handleExport() {
    setIsExporting(true);
    try {
      const data = await exportAllData();

      // Filter by date range if provided
      let expenses = data.expenses;
      if (fromDate && toDate) {
        const fromDateStr = format(fromDate, "yyyy-MM-dd");
        const toDateStr = format(toDate, "yyyy-MM-dd");
        expenses = expenses.filter(
          (e) => e.date >= fromDateStr && e.date <= toDateStr
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
    setFromDate(undefined);
    setToDate(undefined);
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
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "justify-start text-left font-normal",
                        !fromDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {fromDate ? format(fromDate, "MMM dd") : "From"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={fromDate}
                      onSelect={setFromDate}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "justify-start text-left font-normal",
                        !toDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {toDate ? format(toDate, "MMM dd") : "To"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={toDate}
                      onSelect={setToDate}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
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
