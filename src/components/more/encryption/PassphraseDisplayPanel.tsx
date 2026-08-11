import { Eye, EyeOff, Pencil, ShieldCheck } from "lucide-react";

interface PassphraseDisplayPanelProps {
  showPassphrase: boolean;
  onToggleShow: () => void;
  storedPassphrase: string | null;
  onChangeClick: () => void;
}

export function PassphraseDisplayPanel({
  showPassphrase,
  onToggleShow,
  storedPassphrase,
  onChangeClick,
}: PassphraseDisplayPanelProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
        <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0 text-green-500" />
        <p className="text-xs text-muted-foreground">
          Encryption is active. Backups will be encrypted with your passphrase.
        </p>
      </div>

      {/* Masked passphrase display with inline actions */}
      <div className="space-y-1 min-w-0">
        <span className="text-xs text-muted-foreground">Passphrase</span>
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex-1 font-mono tracking-widest text-sm select-none break-all min-w-0">
            {showPassphrase && storedPassphrase ? storedPassphrase : "●".repeat(12)}
          </div>
          <button
            type="button"
            onClick={onToggleShow}
            className="shrink-0 p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            aria-label={showPassphrase ? "Hide passphrase" : "Show passphrase"}
          >
            {showPassphrase ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={onChangeClick}
            className="shrink-0 p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Change passphrase"
          >
            <Pencil className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
