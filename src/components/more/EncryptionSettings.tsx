import { useEffect, useState } from "react";
import {
  Eye,
  EyeOff,
  KeyRound,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
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
            className="pr-10"
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
          className={mismatch ? "border-destructive" : ""}
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
  // Step 1: confirm intent (warning), Step 2: verify + change form
  const [step, setStep] = useState<"warn" | "form">("warn");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showFields, setShowFields] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [verifyError, setVerifyError] = useState("");

  function handleOpenChange(v: boolean) {
    if (!v) {
      // Reset state on close
      setStep("warn");
      setCurrent("");
      setNext("");
      setConfirm("");
      setVerifyError("");
      onClose();
    }
  }

  const mismatch = confirm.length > 0 && next !== confirm;
  const canSubmit = current.length > 0 && next.length >= 8 && next === confirm;

  async function handleChange() {
    if (!canSubmit) return;
    setIsSaving(true);
    setVerifyError("");
    try {
      // Verify current passphrase by attempting a trivial encrypt→decrypt round
      // We don't have a ciphertext on hand, so we just check it matches what's stored.
      const stored = await getStoredPassphrase();
      if (current !== stored) {
        setVerifyError("Current passphrase is incorrect");
        return;
      }
      await storePassphrase(next);
      toast.success(
        "Passphrase updated — old backup files will still require the old passphrase",
      );
      onSuccess();
      handleOpenChange(false);
    } catch {
      toast.error("Failed to update passphrase");
    } finally {
      setIsSaving(false);
    }
  }

  if (!open) return null;

  // Step 1: Warning dialog
  if (step === "warn") {
    return (
      <AlertDialog open={open} onOpenChange={handleOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Change Encryption Passphrase?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
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
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => setStep("form")}>
              I understand, continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  // Step 2: Change form (rendered as a regular dialog-like overlay via AlertDialog)
  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Change Passphrase</AlertDialogTitle>
          <AlertDialogDescription>
            Verify your current passphrase, then enter a new one.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3 py-2">
          {/* Current passphrase */}
          <div className="space-y-1">
            <Label htmlFor="chg-current" className="text-sm">
              Current Passphrase
            </Label>
            <div className="relative">
              <Input
                id="chg-current"
                type={showFields ? "text" : "password"}
                value={current}
                onChange={(e) => {
                  setCurrent(e.target.value);
                  setVerifyError("");
                }}
                placeholder="Current passphrase"
                autoComplete="current-password"
                className={verifyError ? "border-destructive pr-10" : "pr-10"}
              />
              <button
                type="button"
                onClick={() => setShowFields((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showFields ? "Hide" : "Show"}
              >
                {showFields ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {verifyError && (
              <p className="text-xs text-destructive">{verifyError}</p>
            )}
          </div>

          {/* New passphrase */}
          <div className="space-y-1">
            <Label htmlFor="chg-new" className="text-sm">
              New Passphrase
            </Label>
            <Input
              id="chg-new"
              type={showFields ? "text" : "password"}
              value={next}
              onChange={(e) => setNext(e.target.value)}
              placeholder="New passphrase (min 8 chars)"
              autoComplete="new-password"
            />
          </div>

          {/* Confirm new */}
          <div className="space-y-1">
            <Label htmlFor="chg-confirm" className="text-sm">
              Confirm New Passphrase
            </Label>
            <Input
              id="chg-confirm"
              type={showFields ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Re-enter new passphrase"
              autoComplete="new-password"
              className={mismatch ? "border-destructive" : ""}
            />
            {mismatch && (
              <p className="text-xs text-destructive">
                Passphrases do not match
              </p>
            )}
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleChange}
            disabled={!canSubmit || isSaving}
          >
            {isSaving ? "Updating..." : "Update Passphrase"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
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
        <SetupForm onSuccess={load} />
      ) : (
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
            <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0 text-green-500" />
            <p className="text-xs text-muted-foreground">
              Encryption is active. Backups will be encrypted with your
              passphrase.
            </p>
          </div>

          {/* Masked passphrase display */}
          <div className="space-y-1">
            <Label className="text-sm">Passphrase</Label>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-3 py-2 rounded-md bg-muted text-sm font-mono tracking-widest select-none">
                {showPassphrase && storedPassphrase
                  ? storedPassphrase
                  : "●".repeat(12)}
              </div>
              <button
                type="button"
                onClick={() => setShowPassphrase((v) => !v)}
                className="p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
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
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setChangeDialogOpen(true)}
            className="w-full"
          >
            <KeyRound className="h-4 w-4 mr-2" />
            Change Passphrase
          </Button>
        </div>
      )}

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
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-amber-500" />
            Set Up Encryption First
          </DialogTitle>
          <DialogDescription>
            Backups are always encrypted. Please set a passphrase before continuing.
          </DialogDescription>
        </DialogHeader>
        <SetupForm onSuccess={onSuccess} />
      </DialogContent>
    </Dialog>
  );
}
