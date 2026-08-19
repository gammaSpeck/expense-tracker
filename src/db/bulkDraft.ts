import { get, set, del, createStore } from "idb-keyval";

export interface BulkDraftRow {
  id: string;
  value: string;
  category: string;
  description: string;
  tags: string[];
  time: string | null;
  isAdhoc: boolean;
}

export interface BulkDraftBlock {
  id: string;
  date: string; // yyyy-MM-dd
  collapsed: boolean;
  rows: BulkDraftRow[];
}

export interface BulkDraft {
  blocks: BulkDraftBlock[];
}

const store = createStore("expense-tracker-bulk", "draft");

/** Read errors / private-mode failures are treated as "no draft". */
export async function getBulkDraft(): Promise<BulkDraft | null> {
  try {
    return (await get<BulkDraft>("draft", store)) ?? null;
  } catch {
    return null;
  }
}

/** Write failures are swallowed — a lost autosave must never break typing. */
export async function saveBulkDraft(draft: BulkDraft): Promise<void> {
  try {
    await set("draft", draft, store);
  } catch {
    // ignore
  }
}

export async function clearBulkDraft(): Promise<void> {
  try {
    await del("draft", store);
  } catch {
    // ignore
  }
}
