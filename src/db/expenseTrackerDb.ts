import Dexie, { Table } from "dexie";
import type { ZodObject } from "zod";
import { Expense, Category, TagMetadata } from "@/types/expense";
import type { DraftExpense, CategoryRule } from "@/types/csvImport";
import { userPreferences } from "@/db/userPreferences";
import {
  categoryRecordSchema,
  expenseRecordSchema,
  tagMetadataRecordSchema,
} from "@/db/recordSchemas";

// Category colors palette
export const CATEGORY_COLORS = [
  "#EF4444",
  "#F97316",
  "#F59E0B",
  "#EAB308",
  "#84CC16",
  "#22C55E",
  "#10B981",
  "#14B8A6",
  "#06B6D4",
  "#0EA5E9",
  "#3B82F6",
  "#6366F1",
  "#8B5CF6",
  "#A855F7",
  "#D946EF",
  "#EC4899",
  "#F43F5E",
  "#64748B",
  "#0F172A",
  "#DC2626",
  "#EA580C",
  "#D97706",
  "#CA8A04",
  "#65A30D",
  "#16A34A",
  "#059669",
  "#0D9488",
  "#0891B2",
  "#0284C7",
  "#2563EB",
  "#4F46E5",
  "#7C3AED",
  "#9333EA",
  "#C026D3",
  "#DB2777",
  "#E11D48",
];

// Default categories to seed
export const DEFAULT_CATEGORIES: Omit<Category, "id" | "createdAt">[] = [
  {
    name: "Food & Dining",
    icon: "UtensilsCrossed",
    color: "#F97316",
    isDefault: true,
  },
  { name: "Shopping", icon: "ShoppingBag", color: "#EC4899", isDefault: true },
  { name: "Transport", icon: "Car", color: "#3B82F6", isDefault: true },
  { name: "Medical", icon: "Heart", color: "#EF4444", isDefault: true },
  { name: "Bills", icon: "FileText", color: "#8B5CF6", isDefault: true },
  { name: "Entertainment", icon: "Tv", color: "#10B981", isDefault: true },
  { name: "Others", icon: "MoreHorizontal", color: "#64748B", isDefault: true },
];

class ExpenseDatabase extends Dexie {
  expenses!: Table<Expense, string>;
  categories!: Table<Category, string>;
  tagMetadata!: Table<TagMetadata, string>;

  constructor() {
    super("ExpenseTrackerDB");

    // Version 1: initial schema
    this.version(1).stores({
      expenses: "id, category, date, isAdhoc, *tags, createdAt",
      categories: "id, &name",
      tagMetadata: "tag, count, lastUsed",
    });

    // Version 2: add compound index [date+time] to expenses
    this.version(2).stores({
      expenses: "id, category, date, time, [date+time], isAdhoc, *tags, createdAt",
      categories: "id, &name",
      tagMetadata: "tag, count, lastUsed",
    });
  }
}

export const db = new ExpenseDatabase();

// Shape guard for every write path. On update, only changed top-level fields are checked,
// so a legacy bad field (e.g. date "") never blocks an unrelated bulk modify.
function guardTable<T extends object>(table: Table<T, string>, schema: ZodObject) {
  const check = (value: unknown, changed?: Set<string>) => {
    const issue = schema
      .safeParse(value)
      .error?.issues.find((i) => !changed || changed.has(String(i.path[0])));
    if (issue)
      throw new Error(`Invalid ${table.name} record: ${issue.path.join(".")}: ${issue.message}`);
  };
  table.hook("creating", (_key, obj) => check(obj));
  table.hook("updating", (mods, _key, obj) => {
    const next = Dexie.deepClone(obj);
    for (const [keyPath, value] of Object.entries(mods)) Dexie.setByKeyPath(next, keyPath, value);
    check(next, new Set(Object.keys(mods).map((k) => k.split(".")[0])));
  });
}
guardTable(db.expenses, expenseRecordSchema);
guardTable(db.categories, categoryRecordSchema);
guardTable(db.tagMetadata, tagMetadataRecordSchema);

export async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage?.persist) return false;
  if (await navigator.storage.persisted()) return true;
  return navigator.storage.persist();
}

// Preserves installedAt, bumps lastSeenAt, and records the current expense
// count — the signal initializeDatabase() compares against to detect a wipe.
export function touchInstallMarker(expenseCount: number): void {
  const marker = userPreferences.getInstallMarker();
  const now = new Date().toISOString();
  userPreferences.setInstallMarker({
    installedAt: marker?.installedAt ?? now,
    lastSeenAt: now,
    lastSeenExpenseCount: expenseCount,
  });
}

// Initialize database with default categories
export type StartupState =
  | { status: "ready" }
  | { status: "seeded" }
  | { status: "data-loss"; lastSeenExpenseCount: number; installedAt: string; lastSeenAt: string };

export async function initializeDatabase(): Promise<StartupState> {
  const expenseCount = await db.expenses.count();
  const marker = userPreferences.getInstallMarker();

  // Prior install recorded expenses and the table is now empty: do not seed over the evidence.
  if (marker && marker.lastSeenExpenseCount > 0 && expenseCount === 0) {
    return {
      status: "data-loss",
      lastSeenExpenseCount: marker.lastSeenExpenseCount,
      installedAt: marker.installedAt,
      lastSeenAt: marker.lastSeenAt,
    };
  }

  // Count-then-seed in one rw transaction: rw transactions on a store serialize across tabs,
  // so a second tab booting a fresh install sees the seeded rows instead of re-seeding.
  const seeded = await db.transaction("rw", db.categories, async () => {
    if ((await db.categories.count()) > 0) return false;
    const now = new Date().toISOString();
    await db.categories.bulkAdd(
      DEFAULT_CATEGORIES.map((cat) => ({ ...cat, id: crypto.randomUUID(), createdAt: now })),
    );
    return true;
  });

  touchInstallMarker(expenseCount);

  return { status: seeded ? "seeded" : "ready" };
}

// Expense CRUD operations
export async function addExpense(
  expense: Omit<Expense, "id" | "createdAt" | "updatedAt">,
): Promise<string> {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  const newExpense: Expense = {
    ...expense,
    id,
    createdAt: now,
    updatedAt: now,
  };

  await db.expenses.add(newExpense);

  touchInstallMarker(await db.expenses.count());

  // Update tag metadata
  for (const tag of expense.tags) {
    await updateTagMetadata(tag);
  }

  return id;
}

export async function updateExpense(
  id: string,
  updates: Partial<Omit<Expense, "id" | "createdAt">>,
): Promise<void> {
  const now = new Date().toISOString();
  await db.expenses.update(id, { ...updates, updatedAt: now });

  // Update tag metadata for new tags
  if (updates.tags) {
    for (const tag of updates.tags) {
      await updateTagMetadata(tag);
    }
  }
}

export async function deleteExpense(id: string): Promise<void> {
  await db.expenses.delete(id);
  touchInstallMarker(await db.expenses.count());
}

// Returns all expenses ordered by date and time (descending)
export async function getAllExpenses(): Promise<Expense[]> {
  // Dexie compound sort (date+time):
  return db.expenses.orderBy("[date+time]").reverse().toArray();
}

// Category CRUD operations
export async function addCategory(category: Omit<Category, "id" | "createdAt">): Promise<string> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db.categories.add({
    ...category,
    id,
    createdAt: now,
  });

  return id;
}

export async function updateCategory(
  id: string,
  updates: Partial<Omit<Category, "id" | "createdAt">>,
): Promise<void> {
  await db.categories.update(id, updates);
}

export async function deleteCategory(id: string, moveToCategory?: string): Promise<void> {
  const category = await db.categories.get(id);
  if (category?.isDefault && category.name === "Others") {
    throw new Error('Cannot delete the default "Others" category');
  }

  await db.transaction("rw", [db.expenses, db.categories], async () => {
    const inCategory = db.expenses.where("category").equals(id);
    if (moveToCategory) await inCategory.modify({ category: moveToCategory });
    else await inCategory.delete();
    await db.categories.delete(id);
  });

  touchInstallMarker(await db.expenses.count());
}

export async function getAllCategories(): Promise<Category[]> {
  return db.categories.toArray();
}

export async function getCategoryByName(name: string): Promise<Category | undefined> {
  return db.categories.where("name").equals(name).first();
}

// Tag operations
async function updateTagMetadata(tag: string): Promise<void> {
  const existing = await db.tagMetadata.get(tag);
  const now = new Date().toISOString();

  if (existing) {
    await db.tagMetadata.update(tag, {
      count: existing.count + 1,
      lastUsed: now,
    });
  } else {
    await db.tagMetadata.add({
      tag,
      count: 1,
      lastUsed: now,
    });
  }
}

export async function getAllTags(): Promise<TagMetadata[]> {
  return db.tagMetadata.orderBy("count").reverse().toArray();
}

export async function getTagSuggestions(limit: number = 100): Promise<string[]> {
  const tags = await db.tagMetadata.orderBy("count").reverse().limit(limit).toArray();
  return tags.map((t) => t.tag);
}

// Get unique descriptions from past expenses
export async function getDescriptionSuggestions(
  searchQuery?: string,
  limit: number = 10,
): Promise<string[]> {
  const expenses = await db.expenses.orderBy("[date+time]").reverse().toArray();

  // Filter expenses with non-empty descriptions
  const descriptions = expenses
    .filter((e) => e.description && e.description.trim() !== "")
    .map((e) => e.description!.trim());

  // Get unique descriptions
  const uniqueDescriptions = Array.from(new Set(descriptions));

  // Filter by search query if provided (case-insensitive, contains match)
  const filtered = searchQuery
    ? uniqueDescriptions.filter((desc) => desc.toLowerCase().includes(searchQuery.toLowerCase()))
    : uniqueDescriptions;

  // Return limited results
  return filtered.slice(0, limit);
}

export async function deleteTag(tag: string): Promise<void> {
  // Remove tag from all expenses
  const expenses = await db.expenses.where("tags").equals(tag).toArray();
  for (const expense of expenses) {
    const updatedTags = expense.tags.filter((t) => t !== tag);
    await db.expenses.update(expense.id, { tags: updatedTags });
  }

  await db.tagMetadata.delete(tag);
}

// Renaming onto an existing tag merges: tags are deduped per expense and the count is recounted.
export async function renameTag(oldTag: string, newTag: string): Promise<void> {
  await db.transaction("rw", [db.expenses, db.tagMetadata], async () => {
    await db.expenses
      .where("tags")
      .equals(oldTag)
      .modify((e) => {
        e.tags = [...new Set(e.tags.map((t) => (t === oldTag ? newTag : t)))];
      });
    await db.tagMetadata.delete(oldTag);
    const count = await db.expenses.where("tags").equals(newTag).count();
    await db.tagMetadata.put({ tag: newTag, count, lastUsed: new Date().toISOString() });
  });
}

// Export all data
export async function exportAllData(): Promise<{
  expenses: Expense[];
  categories: Category[];
}> {
  const expenses = await db.expenses.toArray();
  const categories = await db.categories.toArray();
  return { expenses, categories };
}

// Import data
export async function importData(data: {
  expenses: Expense[];
  categories: Category[];
}): Promise<void> {
  await db.transaction("rw", [db.expenses, db.categories, db.tagMetadata], async () => {
    // Clear existing data
    await db.expenses.clear();
    await db.categories.clear();
    await db.tagMetadata.clear();

    // Import categories
    await db.categories.bulkAdd(data.categories);

    // Import expenses and rebuild tag metadata
    await db.expenses.bulkAdd(data.expenses);

    // Rebuild tag metadata
    const tagCounts: Record<string, number> = {};
    for (const expense of data.expenses) {
      for (const tag of expense.tags) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      }
    }

    const now = new Date().toISOString();
    const tagMetadata: TagMetadata[] = Object.entries(tagCounts).map(([tag, count]) => ({
      tag,
      count,
      lastUsed: now,
    }));

    await db.tagMetadata.bulkAdd(tagMetadata);
  });

  touchInstallMarker(data.expenses.length);
}

// Resolves the category id for one draft's categoryKey: an explicit rule wins (creating
// the category on first use of a "create" rule), otherwise the default category.
async function resolveCategoryId(
  key: string,
  rule: CategoryRule | undefined,
  defaultCategoryId: string,
  createdCount: number,
): Promise<{ id: string; created: boolean }> {
  if (!key || !rule) return { id: defaultCategoryId, created: false };
  if (rule.kind === "existing") return { id: rule.categoryId, created: false };

  const existingByName = await db.categories.where("name").equals(rule.name).first();
  if (existingByName) return { id: existingByName.id, created: false };

  const totalExisting = await db.categories.count();
  const id = crypto.randomUUID();
  await db.categories.add({
    id,
    name: rule.name,
    icon: "MoreHorizontal",
    color: CATEGORY_COLORS[(totalExisting + createdCount) % CATEGORY_COLORS.length],
    createdAt: new Date().toISOString(),
  });
  return { id, created: true };
}

async function buildCategoryKeyMap(
  drafts: DraftExpense[],
  categoryRules: Record<string, CategoryRule>,
  defaultCategoryId: string,
): Promise<Map<string, string>> {
  const keyToId = new Map<string, string>();
  let createdCount = 0;
  for (const key of new Set(drafts.map((d) => d.categoryKey))) {
    const { id, created } = await resolveCategoryId(
      key,
      categoryRules[key],
      defaultCategoryId,
      createdCount,
    );
    keyToId.set(key, id);
    if (created) createdCount++;
  }
  return keyToId;
}

function countTags(items: { tags: string[] }[]): Map<string, number> {
  const tagCounts = new Map<string, number>();
  for (const item of items) {
    for (const tag of item.tags) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }
  return tagCounts;
}

async function writeTagMetadata(tagCounts: Map<string, number>, now: string): Promise<void> {
  for (const [tag, increment] of tagCounts) {
    const existing = await db.tagMetadata.get(tag);
    await db.tagMetadata.put({ tag, count: (existing?.count ?? 0) + increment, lastUsed: now });
  }
}

// Imports parsed CSV drafts inside one transaction: creates categories referenced by
// "create" rules (deduped by name — `categories` is indexed `id, &name`, so a duplicate
// name throws and aborts the whole import), bulk-writes the expenses, and rebuilds
// tagMetadata (bulkAdd bypasses addExpense, and useTags() reads this table directly).
// Any throw aborts atomically, so a partial write is unreachable — no "partial success" path.
export async function importCsvExpenses(
  drafts: DraftExpense[],
  categoryRules: Record<string, CategoryRule>,
  defaultCategoryId: string,
): Promise<number> {
  const now = new Date().toISOString();
  await db.transaction("rw", [db.expenses, db.categories, db.tagMetadata], async () => {
    if (!(await db.categories.get(defaultCategoryId))) {
      throw new Error(
        "The selected default category no longer exists. Reopen the wizard and choose another.",
      );
    }
    const keyToId = await buildCategoryKeyMap(drafts, categoryRules, defaultCategoryId);
    await db.expenses.bulkAdd(
      drafts.map((d) => ({
        id: crypto.randomUUID(),
        value: d.value,
        category: keyToId.get(d.categoryKey) ?? defaultCategoryId,
        description: d.description,
        tags: d.tags,
        date: d.date,
        time: d.time,
        isAdhoc: d.isAdhoc,
        createdAt: now,
        updatedAt: now,
      })),
    );
    await writeTagMetadata(countTags(drafts), now);
  });

  touchInstallMarker(await db.expenses.count());
  return drafts.length;
}

// Bulk-writes rows built by the bulk-add page inside one Dexie transaction, then rebuilds
// tagMetadata (bulkAdd bypasses addExpense, and useTags() reads this table directly) and
// touches the install marker after the transaction commits. Mirrors importCsvExpenses,
// minus the category-rule machinery — category ids are already resolved by the caller.
// Any throw aborts atomically; a partial write is unreachable.
export async function addExpensesBulk(
  expenses: Omit<Expense, "id" | "createdAt" | "updatedAt">[],
): Promise<number> {
  if (expenses.length === 0) return 0;

  const now = new Date().toISOString();
  await db.transaction("rw", [db.expenses, db.tagMetadata], async () => {
    await db.expenses.bulkAdd(
      expenses.map((expense) => ({
        ...expense,
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
      })),
    );
    await writeTagMetadata(countTags(expenses), now);
  });

  touchInstallMarker(await db.expenses.count());
  return expenses.length;
}
