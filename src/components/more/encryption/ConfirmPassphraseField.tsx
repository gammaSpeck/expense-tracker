import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface ConfirmPassphraseFieldProps {
  value: string;
  onChange: (value: string) => void;
  showPass: boolean;
  mismatch: boolean;
}

export function ConfirmPassphraseField({
  value,
  onChange,
  showPass,
  mismatch,
}: ConfirmPassphraseFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="enc-confirm" className="text-sm">
        Confirm Passphrase
      </Label>
      <Input
        id="enc-confirm"
        type={showPass ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Re-enter passphrase"
        autoComplete="new-password"
        className={`focus-visible:ring-0 focus-visible:ring-offset-0 ${mismatch ? "border-destructive" : ""}`}
      />
      {mismatch && <p className="text-xs text-destructive">Passphrases do not match</p>}
    </div>
  );
}
