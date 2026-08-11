import { format } from "date-fns";
import { toast } from "sonner";
import { exportAllData } from "@/db/expenseTrackerDb";
import { downloadFile } from "@/lib/download";
import { Category } from "@/types/expense";

export function useExportHandlers(categories: Category[], onExported: () => void) {
  const handleExportCSV = async () => {
    try {
      const data = await exportAllData();
      const csvRows = [
        ["Date", "Time", "Category", "Description", "Value", "Tags", "IsAdhoc"].join(","),
        ...data.expenses.map((e) => {
          const category = categories.find((c) => c.id === e.category);
          return [
            e.date,
            e.time,
            `"${category?.name || "Unknown"}"`,
            `"${e.description || ""}"`,
            e.value,
            `"${e.tags.join(", ")}"`,
            e.isAdhoc,
          ].join(",");
        }),
      ];
      downloadFile(
        csvRows.join("\n"),
        `expenses-${format(new Date(), "yyyy-MM-dd")}.csv`,
        "text/csv",
      );
      toast.success("Exported successfully");
      onExported();
    } catch {
      toast.error("Export failed");
    }
  };

  const handleExportJSON = async () => {
    try {
      const data = await exportAllData();
      const exportData = { exportDate: new Date().toISOString(), ...data };
      downloadFile(
        JSON.stringify(exportData, null, 2),
        `expenses-${format(new Date(), "yyyy-MM-dd")}.json`,
        "application/json",
      );
      toast.success("Exported successfully");
      onExported();
    } catch {
      toast.error("Export failed");
    }
  };

  return { handleExportCSV, handleExportJSON };
}
