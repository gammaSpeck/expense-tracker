import { Database } from "lucide-react";
import { useLocation, useNavigate } from "react-router";
import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { BackupCard } from "@/components/more/BackupCard";
import { ImportExportCard } from "@/components/more/ImportExportCard";
import { FactoryReset } from "@/components/more/FactoryReset";
import { EncryptionSettings } from "@/components/more/EncryptionSettings";
import { CsvImportWizard } from "@/components/more/CsvImportWizard";

export default function DataManagementPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const autoOpenBackup = Boolean((location.state as { openBackup?: boolean } | null)?.openBackup);
  const [backupRefreshKey, setBackupRefreshKey] = useState(0);

  function handleBackupSuccess() {
    setBackupRefreshKey((k) => k + 1);
  }

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto space-y-4 overflow-x-hidden">
      <PageHeader
        icon={<Database className="h-5 w-5" />}
        title="Data Management"
        onBack={() => navigate("/settings")}
      />

      <div
        className="space-y-3 animate-slide-in-up"
        style={{ animationDelay: "100ms", animationFillMode: "backwards" }}
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

        <ImportExportCard />

        {/* Danger Zone */}
        <div className="p-4 rounded-xl bg-card border border-destructive/30 space-y-2">
          <FactoryReset />
        </div>
      </div>
    </div>
  );
}
