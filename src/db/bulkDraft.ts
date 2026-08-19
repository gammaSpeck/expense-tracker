import { get, set, del, createStore } from "idb-keyval";
import { z } from "zod";

const rowSchema = z.object({
  id: z.string(),
  value: z.string(),
  category: z.string(),
  description: z.string(),
  tags: z.array(z.string()),
  time: z.string().nullable(),
  isAdhoc: z.boolean(),
});

const blockSchema = z.object({
  id: z.string(),
  date: z.string(), // yyyy-MM-dd
  collapsed: z.boolean(),
  rows: z.array(rowSchema),
});

const draftSchema = z.object({ blocks: z.array(blockSchema) });

export type BulkDraftRow = z.infer<typeof rowSchema>;
export type BulkDraftBlock = z.infer<typeof blockSchema>;
export type BulkDraft = z.infer<typeof draftSchema>;

const store = createStore("expense-tracker-bulk", "draft");

/**
 * Read errors / private-mode failures are treated as "no draft". A record that does not match the
 * current shape (older build, corruption) is deleted rather than rehydrated — an unchecked cast
 * crashes the resume banner's totals pass before the user can reach Discard.
 */
export async function getBulkDraft(): Promise<BulkDraft | null> {
  try {
    const stored = await get<unknown>("draft", store);
    if (stored === undefined) return null;
    const parsed = draftSchema.safeParse(stored);
    if (parsed.success) return parsed.data;
    await del("draft", store);
    return null;
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
