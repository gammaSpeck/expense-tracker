import { Expense, Category } from "@/types/expense";
import { buildBackupEnvelope } from "@/lib/backup";

export function formatExportContent(
  data: { expenses: Expense[]; categories: Category[] },
  formatType: "csv" | "json",
  dateToken: string,
): { content: string; filename: string; mimeType: string } {
  if (formatType === "csv") {
    return {
      content: generateCSV(data.expenses, data.categories),
      filename: `extrack-export-${dateToken}.csv`,
      mimeType: "text/csv",
    };
  }

  return {
    content: buildBackupEnvelope(data),
    filename: `extrack-export-${dateToken}.json`,
    mimeType: "application/json",
  };
}

function generateCSV(expenses: Expense[], categories: Category[]): string {
  const headers = [
    "Date",
    "Time",
    "Category",
    "Description",
    "Value",
    "Tags",
    "IsAdhoc",
    "Attachment",
  ];

  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

  const rows = expenses.map((e) => [
    e.date,
    e.time,
    categoryMap.get(e.category) || "Unknown",
    `"${(e.description || "").replace(/"/g, '""')}"`,
    e.value,
    `"${e.tags.join(";")}"`,
    e.isAdhoc,
    e.attachment ? "[base64]" : "",
  ]);

  return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
}
