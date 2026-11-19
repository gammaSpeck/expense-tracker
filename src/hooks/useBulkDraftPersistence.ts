import { useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { getBulkDraft, saveBulkDraft, clearBulkDraft } from "@/db/bulkDraft";
import type { BulkDraft, BulkDraftBlock } from "@/db/bulkDraft";
import { draftHasContent } from "@/lib/bulkAddDraft";

const DRAFT_DEBOUNCE_MS = 500;

interface DraftPersistence {
  pendingDraft: BulkDraft | null;
  resumeDraft: () => void;
  discardDraft: () => Promise<void>;
}

/** Loads any autosaved draft on mount (offering it for resume/discard) and, once that decision
 *  is made, debounce-autosaves `blocks` to the same local store on every change. */
export function useBulkDraftPersistence(
  blocks: BulkDraftBlock[],
  setBlocks: Dispatch<SetStateAction<BulkDraftBlock[]>>,
): DraftPersistence {
  const [pendingDraft, setPendingDraft] = useState<BulkDraft | null>(null);
  const [draftDecided, setDraftDecided] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    getBulkDraft().then((draft) => {
      if (cancelled) return;
      if (draft && draftHasContent(draft)) setPendingDraft(draft);
      setDraftDecided(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!draftDecided || pendingDraft) return;
    timerRef.current = setTimeout(() => void saveBulkDraft({ blocks }), DRAFT_DEBOUNCE_MS);
    return () => clearTimeout(timerRef.current);
  }, [blocks, draftDecided, pendingDraft]);

  const resumeDraft = () => {
    if (!pendingDraft) return;
    setBlocks(pendingDraft.blocks);
    setPendingDraft(null);
  };

  const discardDraft = () => {
    clearTimeout(timerRef.current); // an autosave queued while confirm() blocked must not resurrect it
    setPendingDraft(null);
    return clearBulkDraft();
  };

  return { pendingDraft, resumeDraft, discardDraft };
}
