import { z } from "zod";

// Shape of every record that reaches IndexedDB. Shared by the db write guard, the expense
// form and the backup import preview; format only — product limits (max amount, max tags)
// stay in the UI because CSV import intentionally allows more.

export const isoDateSchema = z.iso.date({ error: "Pick a date" });
export const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, { error: "Pick a time" });

const nonBlank = z.string().trim().min(1);
const isoTimestamp = z.iso.datetime();

export const expenseRecordSchema = z.object({
  id: nonBlank,
  value: z.number().positive(),
  category: nonBlank,
  description: z.string().optional(),
  tags: z.array(nonBlank).refine((t) => new Set(t).size === t.length, { error: "Duplicate tags" }),
  date: isoDateSchema,
  time: timeSchema,
  isAdhoc: z.boolean(),
  attachment: z.string().startsWith("data:image/").optional(),
  createdAt: isoTimestamp,
  updatedAt: isoTimestamp,
});

export const categoryRecordSchema = z.object({
  id: nonBlank,
  name: nonBlank,
  icon: nonBlank,
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  isDefault: z.boolean().optional(),
  createdAt: isoTimestamp,
});

export const tagMetadataRecordSchema = z.object({
  tag: nonBlank,
  count: z.number().int().nonnegative(),
  lastUsed: isoTimestamp,
});
