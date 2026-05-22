# Multi-Expense Mode

**Status:** Plan — Ready for Implementation
**Date:** 2026-05-17
**Scope:** Add a table-based bulk entry mode to `ExpenseForm`

---

## Overview

Add a toggle to `ExpenseForm` that switches the single-expense form into a table view for entering many expenses at once. Useful for batch-entry scenarios (entering a week of receipts, splitting a grocery bill into line items, etc.).

---

## Decisions

| Question | Decision |
|---|---|
| Toggle UI | Switch at the top of `ExpenseForm`, visible only when creating (hidden in edit mode) |
| Per-row fields | Full set: Amount, Category, Description, Tags, Date, Time, Adhoc, Attachment |
| Attachments | Per-row (each expense can have its own image) |
| Tags input | Popover-based multi-select. Lists existing tags as checkable items, with an "Add new tag" input at the bottom. Up to 4 tags per row (matches single form). |
| New row defaults | Copy `date`, `time`, `category`, `tags`, `isAdhoc` from the previous row. Leave `value`, `description`, `attachment` blank |
| Bulk save | Transactional all-or-nothing via `db.transaction("rw", ...)` — if any row fails, the whole batch rolls back |

---

## Files

### New
- `src/components/expenses/MultiExpenseForm.tsx` — already exists as a stub; will hold the table UI

### Modified
- `src/components/expenses/ExpenseForm.tsx` — add toggle, branch render

### Extracted (shared by both forms)
- `expenseSchema` — currently inline at [ExpenseForm.tsx:38-50](../../src/components/expenses/ExpenseForm.tsx#L38-L50). Move to `src/lib/expenseSchema.ts` (or co-locate in a shared module).
- `initDefaults` / `makeBlankRow` — currently at [ExpenseForm.tsx:59-83](../../src/components/expenses/ExpenseForm.tsx#L59-L83). Same file.
- Image compression handler at [ExpenseForm.tsx:154-176](../../src/components/expenses/ExpenseForm.tsx#L154-L176) — extract to a `compressAndEncodeImage(file)` helper.

---

## Implementation Steps

### 1. Fix the existing toggle state

In [ExpenseForm.tsx:94](../../src/components/expenses/ExpenseForm.tsx#L94):

```tsx
const [multiExpenseMode, setMultiExpenseMode] = useState<boolean>(false);
```

Add `boolean` type and `false` default.

### 2. Render the toggle (create mode only)

Above the Amount input, mirroring the Adhoc switch pattern at [ExpenseForm.tsx:436-452](../../src/components/expenses/ExpenseForm.tsx#L436-L452):

```tsx
{!expense && (
  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
    <Label htmlFor="multiMode">Multiple expenses</Label>
    <Switch
      id="multiMode"
      checked={multiExpenseMode}
      onCheckedChange={setMultiExpenseMode}
    />
  </div>
)}
```

### 3. Branch the render

Early-return when multi mode is on:

```tsx
if (multiExpenseMode) {
  return <MultiExpenseForm onSuccess={onSuccess} onCancel={onCancel} />;
}
```

### 4. Fix `MultiExpenseForm` export style

Currently default-export. Codebase uses named exports — change to:

```tsx
export function MultiExpenseForm({ onSuccess, onCancel }: Props) { ... }
```

And import as `{ MultiExpenseForm }`.

### 5. Row state via `useFieldArray`

```tsx
const { control, register, handleSubmit, watch, setValue } = useForm<{
  expenses: ExpenseFormData[];
}>({
  resolver: zodResolver(z.object({ expenses: z.array(expenseSchema).min(1) })),
  defaultValues: { expenses: [makeBlankRow()] },
});
const { fields, append, remove } = useFieldArray({ control, name: "expenses" });
```

### 6. Table layout

Use the existing primitives from [src/components/ui/table.tsx](../../src/components/ui/table.tsx). Wrap in `overflow-x-auto` — the full field set is wide and will scroll horizontally on mobile.

| Column | Component |
|---|---|
| Amount | `<Input type="number">` with `register(\`expenses.${i}.value\`, { valueAsNumber: true })` |
| Category | `<Controller>` + `<Select>` (same as [ExpenseForm.tsx:241-282](../../src/components/expenses/ExpenseForm.tsx#L241-L282)) |
| Description | `<Input>` (skip the description-suggestions dropdown in bulk mode) |
| Tags | `<Popover>` trigger showing selected tag chips (max 4). Popover body lists existing tags from `getTagSuggestions()` as checkable items, plus an input at the bottom to add a new tag. Same 4-tag cap as the single form. |
| Date | `<Popover>` + `<Calendar>` (same as [ExpenseForm.tsx:395-423](../../src/components/expenses/ExpenseForm.tsx#L395-L423)) |
| Time | `<Input type="time">` |
| Adhoc | `<Switch>` |
| Attachment | Small `<label>` + 40px thumbnail; reuse `compressAndEncodeImage` per row. Click thumbnail to remove. |
| Delete row | `<Button variant="ghost" size="icon">` calling `remove(i)`, disabled when `fields.length === 1` |

### 7. Add-row with carry-forward defaults

```tsx
const expenses = watch("expenses");
const handleAddRow = () => {
  const last = expenses[expenses.length - 1];
  append({
    value: null,
    description: "",
    attachment: undefined,
    category: last.category,
    tags: last.tags,
    date: last.date,
    time: last.time,
    isAdhoc: last.isAdhoc,
  });
};
```

### 8. Footer actions

Below the table:
- **Add row** — calls `handleAddRow`
- **Cancel** — calls `onCancel`
- **Save all** — submits all rows transactionally

### 9. Transactional bulk save

Add a new helper to [src/db/expenseTrackerDb.ts](../../src/db/expenseTrackerDb.ts):

```ts
export async function addExpenses(
  expenses: Omit<Expense, "id" | "createdAt" | "updatedAt">[],
): Promise<string[]> {
  const now = new Date().toISOString();
  const records: Expense[] = expenses.map((e) => ({
    ...e,
    id: uuidv4(),
    createdAt: now,
    updatedAt: now,
  }));

  await db.transaction("rw", db.expenses, db.tagMetadata, async () => {
    await db.expenses.bulkAdd(records);
    const allTags = [...new Set(records.flatMap((r) => r.tags))];
    for (const tag of allTags) {
      await updateTagMetadata(tag);
    }
  });

  return records.map((r) => r.id);
}
```

Key properties:
- **All-or-nothing**: if any row fails (validation, disk, etc.), Dexie rolls back the entire transaction. DB returns to its pre-save state.
- **Tag metadata** stays in the same transaction so it can't drift out of sync.
- **Deduped tag updates** — one update per unique tag across all rows.

Then in `MultiExpenseForm`:

```tsx
const onSubmit = async ({ expenses }: { expenses: ExpenseFormData[] }) => {
  try {
    await addExpenses(expenses);
    toast.success(`${expenses.length} expenses added`);
    onSuccess?.();
  } catch (err) {
    toast.error("Failed to save expenses — nothing was saved");
  }
};
```

---

## Out of Scope

- Description-suggestions dropdown inside table cells (kept for single mode)
- Per-row validation error UI beyond a generic toast (rely on the zod resolver to block submit)
- Pasting rows from a spreadsheet
