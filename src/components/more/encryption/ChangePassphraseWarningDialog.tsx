import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ChangePassphraseWarningDialogProps {
  open: boolean;
  onClose: () => void;
  onContinue: () => void;
}

// Uses plain Dialog (not AlertDialog) so the "continue" button can advance to
// the next step without auto-closing — AlertDialogAction always closes on click.
export function ChangePassphraseWarningDialog({
  open,
  onClose,
  onContinue,
}: ChangePassphraseWarningDialogProps) {
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
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Change Encryption Passphrase?
          </DialogTitle>
          <DialogDescription asChild className="text-left">
            <div className="space-y-2 text-sm">
              <p>
                Changing your passphrase will <strong>not</strong> re-encrypt existing backup
                files. Any backup created with your current passphrase will still require it.
              </p>
              <p>
                Only backups made <strong>after</strong> this change will use the new passphrase.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onContinue}>I understand, continue</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
