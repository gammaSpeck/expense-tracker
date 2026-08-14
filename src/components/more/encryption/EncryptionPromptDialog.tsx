import { ShieldCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SetupForm } from "@/components/more/encryption/SetupForm";

interface EncryptionPromptDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title: string;
  description: string;
}

/** Shared shell for the two "enter a passphrase into SetupForm" dialogs. */
export function EncryptionPromptDialog({
  open,
  onClose,
  onSuccess,
  title,
  description,
}: EncryptionPromptDialogProps) {
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
            {title}
          </DialogTitle>
          <DialogDescription className="text-left">{description}</DialogDescription>
        </DialogHeader>
        <SetupForm onSuccess={onSuccess} />
      </DialogContent>
    </Dialog>
  );
}
