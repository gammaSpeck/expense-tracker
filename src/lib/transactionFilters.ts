import { endOfDay, endOfMonth, endOfYear, format, startOfDay, startOfMonth, startOfYear, subMonths } from "date-fns";
import type { Category, DateRange, ExpenseFilters } from "@/types/expense";

export type DatePreset = "all" | "thisMonth" | "lastMonth" | "last3Months" | "thisYear" | "custom";

export const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: "all", label: "Any time" },
  { value: "thisMonth", label: "This month" },
  { value: "lastMonth", label: "Last month" },
  { value: "last3Months", label: "Last 3 months" },
  { value: "thisYear", label: "This year" },
  { value: "custom", label: "Custom" },
];

export interface TransactionFilterState {
  categories: string[];
  tags: string[];
  minAmount: string; // raw input text, not a number
  maxAmount: string;
  datePreset: DatePreset;
  customRange?: DateRange;
  excludeAdhoc: boolean;
}

export const EMPTY_FILTER_STATE: TransactionFilterState = {
  categories: [],
  tags: [],
  minAmount: "",
  maxAmount: "",
  datePreset: "all",
  customRange: undefined,
  excludeAdhoc: false,
};

export interface FilterChip {
  id: string; // "category:<id>" | "tag:<tag>" | "amount" | "date" | "adhoc"
  label: string;
}

/** Resolves a date preset (plus optional custom range) to a concrete `DateRange`, or
 *  `undefined` for "no date constraint". Expense dates parse to local midnight via
 *  `parseISO`, so bounds are normalised to day boundaries here. */
export function dateRangeForPreset(
  preset: DatePreset,
  customRange?: DateRange,
  now: Date = new Date(),
): DateRange | undefined {
  switch (preset) {
    case "all":
      return undefined;
    case "thisMonth":
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case "lastMonth": {
      const lastMonth = subMonths(now, 1);
      return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
    }
    case "last3Months":
      return { start: startOfMonth(subMonths(now, 2)), end: endOfDay(now) };
    case "thisYear":
      return { start: startOfYear(now), end: endOfYear(now) };
    case "custom": {
      if (!customRange) return undefined;
      const [start, end] =
        customRange.start <= customRange.end
          ? [customRange.start, customRange.end]
          : [customRange.end, customRange.start];
      return { start: startOfDay(start), end: endOfDay(end) };
    }
  }
}

/** Parses a raw amount input into a non-negative finite number, or `undefined` when the
 *  field means "no bound" (blank, non-numeric, or negative). */
export function parseAmount(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

export function buildExpenseFilters(state: TransactionFilterState, search: string): ExpenseFilters {
  return {
    search: search || undefined,
    categories: state.categories.length ? state.categories : undefined,
    tags: state.tags.length ? state.tags : undefined,
    dateRange: dateRangeForPreset(state.datePreset, state.customRange),
    includeAdhoc: state.excludeAdhoc ? false : undefined,
    minAmount: parseAmount(state.minAmount),
    maxAmount: parseAmount(state.maxAmount),
  };
}

/** Single source of truth for both the FAB badge count and the chip row -- they read
 *  from the same array and can never disagree. */
export function activeFilterChips(
  state: TransactionFilterState,
  categories: Category[],
  formatAmount: (value: number) => string,
): FilterChip[] {
  const chips: FilterChip[] = [];

  for (const id of state.categories) {
    chips.push({ id: `category:${id}`, label: categories.find((c) => c.id === id)?.name ?? id });
  }

  for (const tag of state.tags) {
    chips.push({ id: `tag:${tag}`, label: `#${tag}` });
  }

  const min = parseAmount(state.minAmount);
  const max = parseAmount(state.maxAmount);
  if (min !== undefined || max !== undefined) {
    const label =
      min !== undefined && max !== undefined
        ? `${formatAmount(min)} – ${formatAmount(max)}`
        : min !== undefined
          ? `${formatAmount(min)}+`
          : `Up to ${formatAmount(max!)}`;
    chips.push({ id: "amount", label });
  }

  const dateRange = dateRangeForPreset(state.datePreset, state.customRange);
  if (dateRange) {
    const label =
      state.datePreset === "custom"
        ? `${format(dateRange.start, "d MMM")} – ${format(dateRange.end, "d MMM")}`
        : (DATE_PRESETS.find((p) => p.value === state.datePreset)?.label ?? "");
    chips.push({ id: "date", label });
  }

  if (state.excludeAdhoc) {
    chips.push({ id: "adhoc", label: "No ad-hoc" });
  }

  return chips;
}
