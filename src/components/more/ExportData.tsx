import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { Download, HardDrive, CloudUpload } from "lucide-react";
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
import { markBackupCompleted } from "@/lib/backupReminder";
import { Expense, Category } from "@/types/expense";
import { toast } from "sonner";
import {
  isDriveConnected,
  getDriveCredentials,
  saveDriveCredentials,
} from "@/db/driveCredentials";
import { getValidAccessToken, DriveSessionExpiredError } from "@/lib/driveAuth";
import { uploadFileToDrive, findOrCreateBackupFolder } from "@/lib/driveApi";

interface ExportDataProps {
  openOnMount?: boolean;
}

export function ExportData({ openOnMount = false }: ExportDataProps) {
  const [open, setOpen] = useState(false);
  const [formatType, setFormatType] = useState<"csv" | "json">("json");
  const [saveTo, setSaveTo] = useState<"device" | "drive">("device");
  const [isExporting, setIsExporting] = useState(false);
  const hasAutoOpenedRef = useRef(false);
  const [driveConnected, setDriveConnected] = useState(false);

  useEffect(() => {
    isDriveConnected().then(setDriveConnected);
  }, []);

  useEffect(() => {
    if (!openOnMount || hasAutoOpenedRef.current) return;

    setFormatType("json");
    setOpen(true);
    hasAutoOpenedRef.current = true;
  }, [openOnMount]);

  // Drive exports are JSON-only — enforce when switching to Drive
  function handleSaveToChange(value: "device" | "drive") {
    setSaveTo(value);
    if (value === "drive") setFormatType("json");
  }

  const resetForm = () => {
    setFormatType("json");
    setSaveTo("device");
  };

  async function handleExport() {
    setIsExporting(true);
    try {
      const data = await exportAllData();
      const dateToken = format(new Date(), "yyyy-MM-dd");
      const filename = `extrack-backup-${dateToken}.json`;

      if (saveTo === "drive") {
        // --- Google Drive export ---
        let accessToken: string;
        try {
          accessToken = await getValidAccessToken();
        } catch (err) {
          const message =
            err instanceof DriveSessionExpiredError
              ? "Google Drive session expired. Please reconnect."
              : "Could not connect to Google Drive. Please reconnect.";
          toast.error(message, {
            action: {
              label: "Go to Settings",
              onClick: () => (window.location.href = "/settings/data"),
            },
          });
          return;
        }

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
        const blob = new Blob([json], { type: "application/json" });
        const creds = await getDriveCredentials();
        if (!creds) return;
        const folderID = await findOrCreateBackupFolder(accessToken);

        // Update folderID in case it was (re)created
        if (folderID !== creds.folderID) {
          await saveDriveCredentials({ ...creds, folderID });
        }

        const { webViewLink } = await uploadFileToDrive(
          blob,
          filename,
          folderID,
          accessToken,
        );

        markBackupCompleted();
        toast.success("Backup saved to Google Drive", {
          action: {
            label: "View in Drive ↗",
            onClick: () => window.open(webViewLink, "_blank"),
          },
        });
      } else {
        // --- Device export ---
        if (formatType === "csv") {
          const csv = generateCSV(data.expenses, data.categories);
          downloadFile(csv, `extrack-backup-${dateToken}.csv`, "text/csv");
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
          downloadFile(json, filename, "application/json");
        }
        markBackupCompleted();
        toast.success(`Exported ${data.expenses.length} expenses`);
      }

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
      <Button
        onClick={() => setOpen(true)}
        variant="outline"
        className="w-full justify-start"
      >
        <Download className="h-4 w-4 mr-2" />
        Export Backup
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Export Backup</DialogTitle>
            <DialogDescription>
              Export all your expenses and categories. Includes all data.
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
                  disabled={saveTo === "drive"}
                  className={`py-2 rounded-lg transition-all ${
                    formatType === "csv"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80"
                  } disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  CSV
                </button>
              </div>
              {saveTo === "drive" && (
                <p className="text-xs text-muted-foreground">
                  Drive backups are always JSON.
                </p>
              )}
            </div>

            {/* Save To */}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Save to</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleSaveToChange("device")}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all ${
                    saveTo === "device"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80"
                  }`}
                >
                  <HardDrive className="h-3.5 w-3.5" />
                  This Device
                </button>
                <button
                  onClick={() => driveConnected && handleSaveToChange("drive")}
                  disabled={!driveConnected}
                  title={
                    !driveConnected
                      ? "Connect Google Drive in Settings"
                      : undefined
                  }
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all ${
                    saveTo === "drive"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80"
                  } disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  <CloudUpload className="h-3.5 w-3.5" />
                  Google Drive
                </button>
              </div>
              {!driveConnected && (
                <p className="text-xs text-muted-foreground">
                  Connect Google Drive in{" "}
                  <a
                    href="/settings/data"
                    className="underline underline-offset-2"
                  >
                    Settings
                  </a>{" "}
                  to enable cloud backup.
                </p>
              )}
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
