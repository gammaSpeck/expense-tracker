import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SetupPassphraseDialog } from "@/components/more/EncryptionSettings";
import { usePassphraseGate } from "@/hooks/usePassphraseGate";
import { useExportAction } from "@/hooks/useExportAction";
import { ExportDialogContent } from "@/components/more/export/ExportDialogContent";

export function ExportData() {
  const [open, setOpen] = useState(false);
  const [formatType, setFormatType] = useState<"csv" | "json">("json");
  const [encrypt, setEncrypt] = useState(false);
  const { isExporting, handleExport } = useExportAction(formatType, encrypt, () => {
    setFormatType("json");
    setEncrypt(false);
    setOpen(false);
  });
  const { passphraseSetupOpen, closeGate, requestOrProceed } = usePassphraseGate(() =>
    setTimeout(() => handleExport(), 0),
  );

  // Gate: if encrypt is requested but no passphrase set, open setup first
  function handleExportClick() {
    if (encrypt) {
      requestOrProceed();
    } else {
      handleExport();
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
        onClose={closeGate}
        onSuccess={() => {
          closeGate();
          // Re-trigger export now that passphrase is set
          setTimeout(() => handleExport(), 0);
        }}
      />

      <ExportDialogContent
        open={open}
        onOpenChange={setOpen}
        formatType={formatType}
        setFormatType={setFormatType}
        encrypt={encrypt}
        setEncrypt={setEncrypt}
        isExporting={isExporting}
        onExportClick={handleExportClick}
      />
    </>
  );
}
