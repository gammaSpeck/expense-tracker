import { useState } from "react";
import { KeyRound, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEncryptionStatus } from "@/hooks/useEncryptionStatus";
import { ChangePassphraseWarningDialog } from "@/components/more/encryption/ChangePassphraseWarningDialog";
import { SetNewPassphraseDialog } from "@/components/more/encryption/SetNewPassphraseDialog";
import { PassphraseDisplayPanel } from "@/components/more/encryption/PassphraseDisplayPanel";
import { EncryptionPromptDialog } from "@/components/more/encryption/EncryptionPromptDialog";

// ---------------------------------------------------------------------------
// Sub-component: Change passphrase flow
// ---------------------------------------------------------------------------
interface ChangeDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function ChangePassphraseDialog({ open, onClose, onSuccess }: ChangeDialogProps) {
  const [step, setStep] = useState<"warn" | "form">("warn");

  function handleClose() {
    setStep("warn");
    onClose();
  }

  if (!open) return null;

  return (
    <>
      <ChangePassphraseWarningDialog
        open={step === "warn"}
        onClose={handleClose}
        onContinue={() => setStep("form")}
      />
      <SetNewPassphraseDialog
        open={step === "form"}
        onClose={handleClose}
        onSuccess={() => {
          onSuccess();
          handleClose();
        }}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Main export: EncryptionSettings
// ---------------------------------------------------------------------------
export function EncryptionSettings() {
  const { hasPassphrase, storedPassphrase, reload } = useEncryptionStatus();
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [changeDialogOpen, setChangeDialogOpen] = useState(false);
  const [setupDialogOpen, setSetupDialogOpen] = useState(false);

  if (hasPassphrase === null) return null; // loading

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold">Encryption</h2>
      </div>

      {!hasPassphrase ? (
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Passphrase:</span>
          <span className="text-sm text-muted-foreground italic">Unset</span>
          <Button variant="outline" size="sm" onClick={() => setSetupDialogOpen(true)}>
            <KeyRound className="h-3.5 w-3.5 mr-1.5" />
            Set Passphrase
          </Button>
        </div>
      ) : (
        <PassphraseDisplayPanel
          showPassphrase={showPassphrase}
          onToggleShow={() => setShowPassphrase((v) => !v)}
          storedPassphrase={storedPassphrase}
          onChangeClick={() => setChangeDialogOpen(true)}
        />
      )}

      <SetupPassphraseDialog
        open={setupDialogOpen}
        onClose={() => setSetupDialogOpen(false)}
        onSuccess={() => {
          setSetupDialogOpen(false);
          reload();
        }}
      />

      <ChangePassphraseDialog
        open={changeDialogOpen}
        onClose={() => setChangeDialogOpen(false)}
        onSuccess={reload}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Exported dialog: used by BackupData to gate backup behind passphrase setup
// ---------------------------------------------------------------------------
interface SetupPassphraseDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function SetupPassphraseDialog({ open, onClose, onSuccess }: SetupPassphraseDialogProps) {
  return (
    <EncryptionPromptDialog
      open={open}
      onClose={onClose}
      onSuccess={onSuccess}
      title="Set Up Encryption First"
      description="Backups are always encrypted. Please set a passphrase before continuing."
    />
  );
}
