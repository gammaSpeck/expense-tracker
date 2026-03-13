import { LazyMotion, domAnimation, m } from "framer-motion";
import { ChevronLeft, Database } from "lucide-react";
import { useLocation, useNavigate } from "react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { BackupCard } from "@/components/more/BackupCard";
import { ExportData } from "@/components/more/ExportData";
import { ImportData } from "@/components/more/ImportData";
import { FactoryReset } from "@/components/more/FactoryReset";
import { EncryptionSettings } from "@/components/more/EncryptionSettings";

export default function DataManagementPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const autoOpenBackup = Boolean((location.state as { openBackup?: boolean } | null)?.openBackup);
  const [backupRefreshKey, setBackupRefreshKey] = useState(0);

  function handleBackupSuccess() {
    setBackupRefreshKey((k) => k + 1);
  }

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
          {/* Encryption card */}
          <div className="p-4 rounded-xl bg-card border border-border/50">
            <EncryptionSettings />
          </div>

          {/* Backup card */}
          <div className="p-4 rounded-xl bg-card border border-border/50">
            <BackupCard
              key={backupRefreshKey}
              openOnMount={autoOpenBackup}
              onBackupSuccess={handleBackupSuccess}
            />
          </div>

          {/* Import & Export card */}
          <div className="p-4 rounded-xl bg-card border border-border/50 space-y-4">
            <h2 className="text-sm font-semibold">Import & Export</h2>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                Export your data as JSON or CSV. Does not affect backup reminders.
              </p>
              <ExportData />
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                Restore from an encrypted .extrack backup file. Choose merge or override mode.
              </p>
              <ImportData />
            </div>
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
