import { describe, expect, it } from "bun:test";
import {
  activeFilterChips,
  dateRangeForPreset,
  EMPTY_FILTER_STATE,
  parseAmount,
} from "@/lib/transactionFilters";

describe("parseAmount", () => {
  it("treats blank as no bound", () => {
    expect(parseAmount("")).toBeUndefined();
  });

  it("trims and parses a valid number", () => {
    expect(parseAmount("  250 ")).toBe(250);
  });

  it("treats non-numeric input as no bound", () => {
    expect(parseAmount("abc")).toBeUndefined();
  });

  it("treats negative input as no bound", () => {
    expect(parseAmount("-5")).toBeUndefined();
  });

  it("accepts zero", () => {
    expect(parseAmount("0")).toBe(0);
  });
});

describe("dateRangeForPreset", () => {
  it("returns undefined for 'all'", () => {
    expect(dateRangeForPreset("all")).toBeUndefined();
  });

  it("spans the full calendar month for 'thisMonth'", () => {
    const range = dateRangeForPreset("thisMonth", undefined, new Date("2026-03-15T12:00:00"));
    expect(range).toBeDefined();
    expect(range!.start.getFullYear()).toBe(2026);
    expect(range!.start.getMonth()).toBe(2); // March
    expect(range!.start.getDate()).toBe(1);
    expect(range!.start.getHours()).toBe(0);
    expect(range!.end.getMonth()).toBe(2);
    expect(range!.end.getDate()).toBe(31);
    expect(range!.end.getHours()).toBe(23);
  });

  it("swaps an inverted custom range so start precedes end", () => {
    const later = new Date("2026-05-10");
    const earlier = new Date("2026-05-01");
    const range = dateRangeForPreset("custom", { start: later, end: earlier });
    expect(range).toBeDefined();
    expect(range!.start.getTime()).toBeLessThan(range!.end.getTime());
  });
});

describe("activeFilterChips", () => {
  const categories = [
    { id: "c1", name: "Food", icon: "Utensils", color: "#fff", createdAt: "" },
    { id: "c2", name: "Travel", icon: "Plane", color: "#000", createdAt: "" },
  ];
  const formatAmount = (v: number) => `₹${v}`;

  it("returns no chips for the empty state", () => {
    expect(activeFilterChips(EMPTY_FILTER_STATE, categories, formatAmount)).toEqual([]);
  });

  it("returns one chip per active constraint", () => {
    const chips = activeFilterChips(
      {
        ...EMPTY_FILTER_STATE,
        categories: ["c1", "c2"],
        tags: ["work"],
        minAmount: "10",
        maxAmount: "100",
        excludeAdhoc: true,
      },
      categories,
      formatAmount,
    );

    expect(chips).toHaveLength(5);
    expect(chips.map((c) => c.id)).toEqual(["category:c1", "category:c2", "tag:work", "amount", "adhoc"]);
  });
});
