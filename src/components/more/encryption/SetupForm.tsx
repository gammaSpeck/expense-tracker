import { KeyRound, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useSetupPassphraseForm } from "@/hooks/useSetupPassphraseForm";
import { PassphraseInput } from "@/components/more/encryption/PassphraseInput";
import { ConfirmPassphraseField } from "@/components/more/encryption/ConfirmPassphraseField";

interface SetupFormProps {
  onSuccess: () => void;
}

export function SetupForm({ onSuccess }: SetupFormProps) {
  const {
    passphrase,
    setPassphrase,
    confirm,
    setConfirm,
    showPass,
    toggleShowPass,
    isSaving,
    mismatch,
    canSubmit,
    handleSetup,
  } = useSetupPassphraseForm(onSuccess);

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
        <KeyRound className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">
          Set a passphrase to encrypt your backups. You'll need it to restore data on any device.
          <span className="block mt-1 font-medium text-foreground">Minimum 8 characters.</span>
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="enc-pass" className="text-sm">
          Passphrase
        </Label>
        <PassphraseInput
          id="enc-pass"
          value={passphrase}
          onChange={setPassphrase}
          show={showPass}
          onToggleShow={toggleShowPass}
          placeholder="Enter passphrase"
          autoComplete="new-password"
        />
      </div>

      <ConfirmPassphraseField
        value={confirm}
        onChange={setConfirm}
        showPass={showPass}
        mismatch={mismatch}
      />

      <Button onClick={handleSetup} disabled={!canSubmit || isSaving} className="w-full">
        <ShieldCheck className="h-4 w-4 mr-2" />
        {isSaving ? "Saving..." : "Set Passphrase"}
      </Button>
    </div>
  );
}
