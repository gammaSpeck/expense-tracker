import { useEffect, useRef, useState } from "react";
import { Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SetupPassphraseDialog } from "@/components/more/EncryptionSettings";
import { usePassphraseGate } from "@/hooks/usePassphraseGate";
import { useBackupAction } from "@/hooks/useBackupAction";
import { BackupDialog } from "@/components/more/backup/BackupDialog";

interface BackupDataProps {
  openOnMount?: boolean;
  onSuccess?: () => void;
  driveConnected: boolean;
}

export function BackupData({
  openOnMount = false,
  onSuccess,
  driveConnected,
}: BackupDataProps) {
  const [open, setOpen] = useState(false);
  const hasAutoOpenedRef = useRef(false);
  const { passphraseSetupOpen, closeGate, requestOrProceed } = usePassphraseGate(() =>
    setOpen(true),
  );
  const { saveTo, setSaveTo, isBackingUp, handleBackup } = useBackupAction(onSuccess, () =>
    setOpen(false),
  );

  useEffect(() => {
    if (!openOnMount || hasAutoOpenedRef.current) return;
    hasAutoOpenedRef.current = true;
    requestOrProceed();
  }, [openOnMount, requestOrProceed]);

  return (
    <>
      <Button onClick={requestOrProceed} variant="outline" className="w-full justify-start">
        <Archive className="h-4 w-4 mr-2" />
        Create Backup
      </Button>

      {/* Passphrase setup gate — shown when backup is attempted without a passphrase */}
      <SetupPassphraseDialog
        open={passphraseSetupOpen}
        onClose={closeGate}
        onSuccess={() => {
          closeGate();
          setOpen(true);
        }}
      />

      <BackupDialog
        open={open}
        onOpenChange={setOpen}
        saveTo={saveTo}
        setSaveTo={setSaveTo}
        driveConnected={driveConnected}
        isBackingUp={isBackingUp}
        onBackup={handleBackup}
      />
    </>
  );
}
