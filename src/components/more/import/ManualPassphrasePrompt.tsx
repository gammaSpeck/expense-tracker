import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PassphraseInput } from "@/components/more/encryption/PassphraseInput";

interface ManualPassphrasePromptProps {
  passphrase: string;
  onPassphraseChange: (v: string) => void;
  show: boolean;
  onToggleShow: () => void;
  isDecrypting: boolean;
  onCancel: () => void;
  onDecrypt: () => void;
}

export function ManualPassphrasePrompt({
  passphrase,
  onPassphraseChange,
  show,
  onToggleShow,
  isDecrypting,
  onCancel,
  onDecrypt,
}: ManualPassphrasePromptProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
        Encrypted file detected. Enter the passphrase used when this backup was created.
      </div>
      <div className="space-y-2">
        <Label htmlFor="import-pass" className="text-sm">
          Passphrase
        </Label>
        <PassphraseInput
          id="import-pass"
          value={passphrase}
          onChange={onPassphraseChange}
          show={show}
          onToggleShow={onToggleShow}
          onKeyDown={(e) => {
            if (e.key === "Enter") onDecrypt();
          }}
          placeholder="Enter backup passphrase"
          autoComplete="current-password"
          autoFocus
        />
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button onClick={onDecrypt} disabled={!passphrase || isDecrypting} className="flex-1">
          {isDecrypting ? "Decrypting..." : "Decrypt"}
        </Button>
      </div>
    </div>
  );
}
