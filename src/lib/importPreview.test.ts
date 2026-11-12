import { describe, expect, it } from "vite-plus/test";
import { buildImportPreview } from "@/lib/importPreview";

const now = "2026-01-01T00:00:00.000Z";
const expense = (id: string, date: string) => ({
  id,
  value: 10,
  category: "c1",
  tags: [],
  date,
  time: "10:00",
  isAdhoc: false,
  createdAt: now,
  updatedAt: now,
});
const category = { id: "c1", name: "Food", icon: "Utensils", color: "#F97316", createdAt: now };

describe("buildImportPreview", () => {
  it("keeps valid records and names the field that sank each skipped one", () => {
    const preview = buildImportPreview(
      JSON.stringify({
        expenses: [expense("a", "2026-01-02"), expense("b", "2026-01-05"), expense("c", "")],
        categories: [category],
      }),
    );
    expect(preview?.expenseCount).toBe(2);
    expect(preview?.data.expenses).toHaveLength(2);
    expect(preview?.dateRange).toEqual({ earliest: "2026-01-02", latest: "2026-01-05" });
    expect(preview?.skipped).toEqual(["date"]);
  });

  it("rejects a file whose collections are not arrays", () => {
    expect(buildImportPreview(JSON.stringify({ expenses: "nope", categories: [] }))).toBeNull();
  });
});
