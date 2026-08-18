import { daysAgo } from "./app";
import type { SeedExpense } from "./db";

/** 5 rows · 3 categories · 3 distinct dates. Default fixture for list/search/tag/category specs.
 *  Spans month boundaries — never use it for Home or Analysis month totals. */
export const mixed5 = (): SeedExpense[] => [
  { value: 249.5, categoryName: "Transport", description: "Airport cab", tags: ["travel", "work"], date: daysAgo(0), time: "09:15" },
  { value: 80, categoryName: "Food & Dining", description: "Filter coffee", tags: ["cafe"], date: daysAgo(0), time: "08:05" },
  { value: 1499, categoryName: "Shopping", description: "Running shoes", tags: ["fitness"], date: daysAgo(1), time: "18:40" },
  { value: 320, categoryName: "Food & Dining", description: "Team lunch", tags: ["work"], date: daysAgo(4), time: "13:20" },
  { value: 12000, categoryName: "Shopping", description: "Flight to Goa", tags: ["travel"], date: daysAgo(4), time: "11:00", isAdhoc: true },
];

/** 3 rows, all dated today, so they are always inside the current calendar month. */
export const thisMonth3 = (): SeedExpense[] => [
  { value: 1000, categoryName: "Food & Dining", description: "Groceries", tags: [], date: daysAgo(0), time: "10:00" },
  { value: 500, categoryName: "Transport", description: "Metro pass", tags: ["commute"], date: daysAgo(0), time: "11:00" },
  { value: 2500, categoryName: "Shopping", description: "Headphones", tags: [], date: daysAgo(0), time: "12:00", isAdhoc: true },
];

/** 2 rows, today, no adhoc — the "Excluding Adhoc:" line must be absent. */
export const thisMonthNoAdhoc = (): SeedExpense[] => [
  { value: 200, categoryName: "Bills", description: "Electricity", tags: [], date: daysAgo(0), time: "10:00" },
  { value: 100, categoryName: "Entertainment", description: "Movie", tags: [], date: daysAgo(0), time: "11:00" },
];

/** 12 rows, today, one per hour 08:00–19:00, "Item 01" (08:00) … "Item 12" (19:00). */
export const twelveToday = (): SeedExpense[] =>
  Array.from({ length: 12 }, (_, i) => ({
    value: (i + 1) * 10,
    categoryName: "Others",
    description: `Item ${String(i + 1).padStart(2, "0")}`,
    tags: [],
    date: daysAgo(0),
    time: `${String(8 + i).padStart(2, "0")}:00`,
  }));

/** `n` rows, one per day counting back from today, newest first -- matches DB ordering, so
 *  "Row 000" is always the first page and "Row {n-1}" the last. Used for the transactions
 *  infinite-scroll pagination spec. */
export const manyRows = (n: number): SeedExpense[] =>
  Array.from({ length: n }, (_, i) => ({
    value: 10 + i,
    categoryName: "Others",
    description: `Row ${String(i).padStart(3, "0")}`,
    tags: [],
    date: daysAgo(i),
    time: "12:00",
  }));
