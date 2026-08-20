import { useRef } from "react";
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
import { pageTotals } from "@/lib/bulkAddDraft";
import type { BulkDraft } from "@/db/bulkDraft";

export function DraftResumeDialog({
  pendingDraft,
  onResume,
  onDiscard,
}: {
  pendingDraft: BulkDraft | null;
  onResume: () => void;
  onDiscard: () => void;
}) {
  const resumeRef = useRef<HTMLButtonElement>(null);
  if (!pendingDraft) return null;
  const { count } = pageTotals(pendingDraft.blocks);

  return (
    <AlertDialog open>
      <AlertDialogContent
        data-testid="bulk-draft-prompt"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          resumeRef.current?.focus();
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>
            Resume your unsaved draft ({count} {count === 1 ? "entry" : "entries"})?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Entries from your last visit are still on this device. Discarding removes them
            permanently.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onDiscard}>Discard</AlertDialogCancel>
          <AlertDialogAction ref={resumeRef} onClick={onResume}>
            Resume
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
