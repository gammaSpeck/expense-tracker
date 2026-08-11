import { useState } from "react";
import { toast } from "sonner";
import { storePassphrase } from "@/lib/backup";

export function useSetupPassphraseForm(onSuccess: () => void) {
  const [passphrase, setPassphrase] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const mismatch = confirm.length > 0 && passphrase !== confirm;
  const canSubmit = passphrase.length >= 8 && passphrase === confirm;

  async function handleSetup() {
    if (!canSubmit) return;
    setIsSaving(true);
    try {
      await storePassphrase(passphrase);
      toast.success("Encryption passphrase saved");
      onSuccess();
    } catch {
      toast.error("Failed to save passphrase");
    } finally {
      setIsSaving(false);
    }
  }

  return {
    passphrase,
    setPassphrase,
    confirm,
    setConfirm,
    showPass,
    toggleShowPass: () => setShowPass((v) => !v),
    isSaving,
    mismatch,
    canSubmit,
    handleSetup,
  };
}
