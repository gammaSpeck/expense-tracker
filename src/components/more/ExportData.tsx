import { useState } from "react";
import { format } from "date-fns";
import { Download, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { encryptData, getStoredPassphrase } from "@/lib/backup";
import { SetupPassphraseDialog } from "@/components/more/EncryptionSettings";
import { toast } from "sonner";

export function ExportData() {
  const [open, setOpen] = useState(false);
  const [formatType, setFormatType] = useState<"csv" | "json">("json");
  const [encrypt, setEncrypt] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [passphraseSetupOpen, setPassphraseSetupOpen] = useState(false);

  const resetForm = () => {
    setFormatType("json");
    setEncrypt(false);
  };

  async function handleExport() {
    // Gate: if encrypt is requested but no passphrase set, open setup first
    if (encrypt) {
      const passphrase = await getStoredPassphrase();
      if (!passphrase) {
        setPassphraseSetupOpen(true);
        return;
      }
    }

    setIsExporting(true);
    try {
      const data = await exportAllData();
      const dateToken = format(new Date(), "yyyy-MM-dd");

      let content: string;
      let filename: string;
      let mimeType: string;

      if (formatType === "csv") {
        content = generateCSV(data.expenses, data.categories);
        filename = `extrack-export-${dateToken}.csv`;
        mimeType = "text/csv";
      } else {
        content = JSON.stringify(
          {
            exportDate: new Date().toISOString(),
            version: "1.0",
            expenses: data.expenses,
            categories: data.categories,
          },
          null,
          2,
        );
        filename = `extrack-export-${dateToken}.json`;
        mimeType = "application/json";
      }

      if (encrypt) {
        const encryptedContent = await encryptData(content);
        downloadFile(
          encryptedContent,
          filename.replace(/\.(json|csv)$/, ".extrack"),
          "application/octet-stream",
        );
      } else {
        downloadFile(content, filename, mimeType);
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

      {/* Passphrase setup gate */}
      <SetupPassphraseDialog
        open={passphraseSetupOpen}
        onClose={() => setPassphraseSetupOpen(false)}
        onSuccess={() => {
          setPassphraseSetupOpen(false);
          // Re-trigger export now that passphrase is set
          setTimeout(() => handleExport(), 0);
        }}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-left">
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

            {/* Encrypt checkbox */}
            <div className="flex items-center gap-3 p-3 rounded-lg border border-border">
              <Checkbox
                id="export-encrypt"
                checked={encrypt}
                onCheckedChange={(v) => setEncrypt(Boolean(v))}
              />
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="export-encrypt" className="text-sm cursor-pointer">
                  Encrypt this export
                </Label>
              </div>
              {encrypt && <span className="ml-auto text-xs text-muted-foreground">.extrack</span>}
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
