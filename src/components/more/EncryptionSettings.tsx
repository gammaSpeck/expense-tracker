import { useEffect, useState } from "react";
import {
  Eye,
  EyeOff,
  KeyRound,
  Pencil,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { getStoredPassphrase, storePassphrase } from "@/lib/backup";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Sub-component: Setup form (no passphrase stored yet)
// ---------------------------------------------------------------------------
interface SetupFormProps {
  onSuccess: () => void;
}

function SetupForm({ onSuccess }: SetupFormProps) {
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

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
        <KeyRound className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">
          Set a passphrase to encrypt your backups. You'll need it to restore
          data on any device.
          <span className="block mt-1 font-medium text-foreground">
            Minimum 8 characters.
          </span>
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="enc-pass" className="text-sm">
          Passphrase
        </Label>
        <div className="relative">
          <Input
            id="enc-pass"
            type={showPass ? "text" : "password"}
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            placeholder="Enter passphrase"
            className="pr-10 focus-visible:ring-0 focus-visible:ring-offset-0"
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowPass((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label={showPass ? "Hide passphrase" : "Show passphrase"}
          >
            {showPass ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="enc-confirm" className="text-sm">
          Confirm Passphrase
        </Label>
        <Input
          id="enc-confirm"
          type={showPass ? "text" : "password"}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Re-enter passphrase"
          autoComplete="new-password"
          className={`focus-visible:ring-0 focus-visible:ring-offset-0 ${mismatch ? "border-destructive" : ""}`}
        />
        {mismatch && (
          <p className="text-xs text-destructive">Passphrases do not match</p>
        )}
      </div>

      <Button
        onClick={handleSetup}
        disabled={!canSubmit || isSaving}
        className="w-full"
      >
        <ShieldCheck className="h-4 w-4 mr-2" />
        {isSaving ? "Saving..." : "Set Passphrase"}
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: Change passphrase flow
// ---------------------------------------------------------------------------
interface ChangeDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function ChangePassphraseDialog({
  open,
  onClose,
  onSuccess,
}: ChangeDialogProps) {
  const [step, setStep] = useState<"warn" | "form">("warn");

  function handleClose() {
    setStep("warn");
    onClose();
  }

  if (!open) return null;

  return (
    <>
      {/* Step 1: Warning — use plain Dialog so buttons don't auto-close */}
      <Dialog
        open={step === "warn"}
        onOpenChange={(v) => {
          if (!v) handleClose();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Change Encryption Passphrase?
            </DialogTitle>
            <DialogDescription asChild className="text-left">
              <div className="space-y-2 text-sm">
                <p>
                  Changing your passphrase will <strong>not</strong> re-encrypt
                  existing backup files. Any backup created with your current
                  passphrase will still require it.
                </p>
                <p>
                  Only backups made <strong>after</strong> this change will use
                  the new passphrase.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={() => setStep("form")}>
              I understand, continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Step 2: Set new passphrase — same form as first-time setup */}
      <Dialog
        open={step === "form"}
        onOpenChange={(v) => {
          if (!v) handleClose();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-amber-500" />
              Set New Passphrase
            </DialogTitle>
            <DialogDescription className="text-left">
              Old backups will still require the previous passphrase.
            </DialogDescription>
          </DialogHeader>
          <SetupForm
            onSuccess={() => {
              onSuccess();
              handleClose();
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

// ---------------------------------------------------------------------------
// Main export: EncryptionSettings
// ---------------------------------------------------------------------------
export function EncryptionSettings() {
  const [hasPassphrase, setHasPassphrase] = useState<boolean | null>(null);
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [storedPassphrase, setStoredPassphrase] = useState<string | null>(null);
  const [changeDialogOpen, setChangeDialogOpen] = useState(false);
  const [setupDialogOpen, setSetupDialogOpen] = useState(false);

  async function load() {
    const p = await getStoredPassphrase();
    setHasPassphrase(p !== null);
    setStoredPassphrase(p);
  }

  useEffect(() => {
    load();
  }, []);

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
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSetupDialogOpen(true)}
          >
            <KeyRound className="h-3.5 w-3.5 mr-1.5" />
            Set Passphrase
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
            <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0 text-green-500" />
            <p className="text-xs text-muted-foreground">
              Encryption is active. Backups will be encrypted with your
              passphrase.
            </p>
          </div>

          {/* Masked passphrase display with inline actions */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground shrink-0">
              Passphrase:
            </span>
            <span className="flex-1 font-mono tracking-widest text-sm select-none">
              {showPassphrase && storedPassphrase
                ? storedPassphrase
                : "●".repeat(12)}
            </span>
            <button
              type="button"
              onClick={() => setShowPassphrase((v) => !v)}
              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              aria-label={
                showPassphrase ? "Hide passphrase" : "Show passphrase"
              }
            >
              {showPassphrase ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setChangeDialogOpen(true)}
              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Change passphrase"
            >
              <Pencil className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <SetupPassphraseDialog
        open={setupDialogOpen}
        onClose={() => setSetupDialogOpen(false)}
        onSuccess={() => {
          setSetupDialogOpen(false);
          load();
        }}
      />

      <ChangePassphraseDialog
        open={changeDialogOpen}
        onClose={() => setChangeDialogOpen(false)}
        onSuccess={load}
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

export function SetupPassphraseDialog({
  open,
  onClose,
  onSuccess,
}: SetupPassphraseDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-amber-500" />
            Set Up Encryption First
          </DialogTitle>
          <DialogDescription className="text-left">
            Backups are always encrypted. Please set a passphrase before
            continuing.
          </DialogDescription>
        </DialogHeader>
        <SetupForm onSuccess={onSuccess} />
      </DialogContent>
    </Dialog>
  );
}
