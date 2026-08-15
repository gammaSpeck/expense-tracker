import type { CsvColumnMapping } from "@/types/csvImport";
import moneyManagerRealbyteIcon from "@/assets/csv-presets/moneymanager-realbyte.png";
import expenseManagerAmitm29Icon from "@/assets/csv-presets/expense-manager-amitm29.png";

export interface SourcePreset {
  id: string;
  label: string;
  /** Play Store app icon, shown beside the label so users recognize the source app at a glance. */
  icon: string;
  /** Expected de-duplicated header row, compared element-wise to ParsedCsv.headers. */
  headers: string[];
  mapping: CsvColumnMapping;
  /** Trimmed source category value -> ExTrack category NAME (not id; ids are per-install). */
  categoryNames: Record<string, string>;
  ignoreValues: { columnIndex: number; values: string[] };
}

export const SOURCE_PRESETS: SourcePreset[] = [
  {
    id: "money-manager-realbyte",
    label: "MoneyManager (Realbyte)",
    icon: moneyManagerRealbyteIcon,
    // Second "Account" column is surfaced as "Account (2)" by dedupeHeaders.
    headers: [
      "Date",
      "Account",
      "Category",
      "Subcategory",
      "Note",
      "INR",
      "Income/Expense",
      "Description",
      "Amount",
      "Currency",
      "Account (2)",
    ],
    mapping: {
      amount: 8,
      dateTime: 0,
      dateTimeExtra: null,
      dateFormat: "dd/MM/yyyy HH:mm:ss",
      category: 2,
      description: 7,
      tags: [3, 4, 1],
    },
    categoryNames: {
      Apparel: "Shopping",
      Bills: "Bills",
      Food: "Food & Dining",
      Gift: "Gift",
      Household: "Household",
      Investments: "Investments",
      Other: "Others",
      Possessions: "Possessions",
      "Social Life": "Social Life",
      Transportation: "Transport",
      Vehicles: "Vehicles",
      "Well Being": "Well Being",
    },
    ignoreValues: { columnIndex: 6, values: ["Income", "Transfer"] },
  },
  {
    id: "expense-manager-amitm29",
    label: "Money Manager & Expense tracker (Amit Mohan)",
    icon: expenseManagerAmitm29Icon,
    headers: ["Date", "Category", "Amount", "Note", "Type", "Payment mode", "To payment mode", "Tags"],
    mapping: {
      amount: 2,
      dateTime: 0,
      dateTimeExtra: null,
      dateFormat: "yyyy-MM-dd HH:mm",
      category: 1,
      description: 3,
      tags: [7],
    },
    categoryNames: {
      "Bills and Utilities": "Bills",
      Experiences: "Experiences",
      Experiments: "Experiments",
      Family: "Family",
      "Food and Dining": "Food & Dining",
      "Gifts and Donation": "Gifts and Donation",
      "Health & Wellness": "Health & Wellness",
      Home: "Home",
      Medical: "Medical",
      Misc: "Others",
      "Personal Care": "Personal Care",
      Transport: "Transport",
      Upskilling: "Upskilling",
    },
    ignoreValues: { columnIndex: 4, values: ["Income", "Transfer"] },
  },
];

export function detectPreset(headers: string[]): SourcePreset | null {
  return (
    SOURCE_PRESETS.find(
      (preset) => preset.headers.length === headers.length && preset.headers.every((h, i) => h === headers[i]),
    ) ?? null
  );
}

export function findPreset(id: string | null): SourcePreset | null {
  return SOURCE_PRESETS.find((preset) => preset.id === id) ?? null;
}
