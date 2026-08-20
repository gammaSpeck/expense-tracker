import { useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { getBulkDraft, saveBulkDraft, clearBulkDraft } from "@/db/bulkDraft";
import type { BulkDraft, BulkDraftBlock } from "@/db/bulkDraft";
import { draftHasContent } from "@/lib/bulkAddDraft";

const DRAFT_DEBOUNCE_MS = 500;

interface DraftPersistence {
  pendingDraft: BulkDraft | null;
  resumeDraft: () => void;
  discardDraft: () => void;
}

/** Loads any autosaved draft on mount (offering it for resume/discard) and, once that decision
 *  is made, debounce-autosaves `blocks` to the same local store on every change. */
export function useBulkDraftPersistence(
  blocks: BulkDraftBlock[],
  setBlocks: Dispatch<SetStateAction<BulkDraftBlock[]>>,
): DraftPersistence {
  const [pendingDraft, setPendingDraft] = useState<BulkDraft | null>(null);
  const [draftDecided, setDraftDecided] = useState(false);

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
    const timer = setTimeout(() => void saveBulkDraft({ blocks }), DRAFT_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [blocks, draftDecided, pendingDraft]);

  const resumeDraft = () => {
    if (!pendingDraft) return;
    setBlocks(pendingDraft.blocks);
    setPendingDraft(null);
  };

  const discardDraft = () => {
    setPendingDraft(null);
    void clearBulkDraft();
  };

  return { pendingDraft, resumeDraft, discardDraft };
}
