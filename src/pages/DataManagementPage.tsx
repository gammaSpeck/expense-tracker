import { LazyMotion, domAnimation, m } from "framer-motion";
import { ChevronLeft, Database } from "lucide-react";
import { useLocation, useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { ExportData } from "@/components/more/ExportData";
import { ImportData } from "@/components/more/ImportData";
import { FactoryReset } from "@/components/more/FactoryReset";
import { BackupReminderSettings } from "@/components/more/BackupReminderSettings";
import { GoogleDriveSettings } from "@/components/more/GoogleDriveSettings";

export default function DataManagementPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const autoOpenExport = Boolean((location.state as { openExport?: boolean } | null)?.openExport);

  return (
    <LazyMotion features={domAnimation}>
      <div className="px-4 py-6 max-w-2xl mx-auto space-y-4 overflow-x-hidden">
        <m.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2"
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 -ml-2"
            onClick={() => navigate("/settings")}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <Database className="h-5 w-5" />
            Data Management
          </h1>
        </m.div>

        <m.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-3"
        >
          <div className="p-4 rounded-xl bg-card border border-border/50">
            <BackupReminderSettings />
          </div>

          {/* Google Drive */}
          <div className="p-4 rounded-xl bg-card border border-border/50">
            <GoogleDriveSettings />
          </div>

          {/* Export */}
          <div className="p-4 rounded-xl bg-card border border-border/50 space-y-2">
            <h2 className="text-sm font-medium">Export Backup</h2>
            <p className="text-xs text-muted-foreground">
              Download all your expenses and categories as a backup file.
            </p>
            <ExportData openOnMount={autoOpenExport} />
          </div>

          {/* Import */}
          <div className="p-4 rounded-xl bg-card border border-border/50 space-y-2">
            <h2 className="text-sm font-medium">Import Backup</h2>
            <p className="text-xs text-muted-foreground">
              Restore from a JSON backup file. Choose merge or override mode.
            </p>
            <ImportData />
          </div>

          {/* Danger Zone */}
          <div className="p-4 rounded-xl bg-card border border-destructive/30 space-y-2">
            <FactoryReset />
          </div>
        </m.div>
      </div>
    </LazyMotion>
  );
}
