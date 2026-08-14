import { EncryptionPromptDialog } from "@/components/more/encryption/EncryptionPromptDialog";

interface SetNewPassphraseDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// Step 2 of the change-passphrase flow — same form as first-time setup.
export function SetNewPassphraseDialog({ open, onClose, onSuccess }: SetNewPassphraseDialogProps) {
  return (
    <EncryptionPromptDialog
      open={open}
      onClose={onClose}
      onSuccess={onSuccess}
      title="Set New Passphrase"
      description="Old backups will still require the previous passphrase."
    />
  );
}
