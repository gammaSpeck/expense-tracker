// Expense Tracker Type Definitions

export interface Expense {
  id: string;
  value: number;
  category: string; // Category ID
  description?: string;
  tags: string[];
  date: string; // ISO date string (YYYY-MM-DD)
  time: string; // HH:mm format
  isAdhoc: boolean;
  attachment?: string; // base64 encoded image
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

export interface Category {
  id: string;
  name: string;
  icon: string; // Lucide icon name
  color: string; // Hex color code
  isDefault?: boolean; // Cannot delete default categories
  createdAt: string;
}

export interface TagMetadata {
  tag: string;
  count: number;
  lastUsed: string; // ISO timestamp
}

// Form types
export interface ExpenseFormData {
  value: number | null;
  category: string;
  description?: string;
  tags: string[];
  date: string;
  time: string;
  isAdhoc: boolean;
  attachment?: string;
}

export interface CategoryFormData {
  name: string;
  icon: string;
  color: string;
}

// Filter types
export type TimePeriod = "week" | "month" | "year" | "custom";

export interface DateRange {
  start: Date;
  end: Date;
}

export interface ExpenseFilters {
  search?: string;
  categories?: string[];
  tags?: string[];
  dateRange?: DateRange;
  includeAdhoc?: boolean;
  timePeriod?: TimePeriod;
}

// Analysis types
export interface CategorySummary {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  categoryIcon: string;
  total: number;
  count: number;
  percentage: number;
}

export interface DailySummary {
  date: string;
  total: number;
  count: number;
}

export interface AnalysisSummary {
  totalExpenses: number;
  totalTransactions: number;
  averageExpense: number;
  topCategory: CategorySummary | null;
  categoryBreakdown: CategorySummary[];
  dailyTrend: DailySummary[];
}

// Theme types
export type Theme = "light" | "dark" | "system";


