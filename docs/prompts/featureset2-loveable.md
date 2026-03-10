# 🚀 Expense Tracker - Feature Set 2 Enhancements

## 📋 Overview

This document outlines the second iteration of enhancements for the Expense Tracker PWA. These changes build upon the existing scaffolded application and introduce navigation redesign, settings management, and improved data management features.

**Target:** One-shot implementation in Lovable.dev  
**Base Version:** v0.0.1  
**Enhancement Version:** v0.0.2  
**Date:** 2025-12-18

---

## 🏗️ Technical Stack Confirmation

### **Current Package Versions (CRITICAL - Use These Exact Versions):**

```json
{
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router": "^7.11.0",
    "dexie": "^4.2.1",
    "dexie-react-hooks": "^4.2.0",
    "recharts": "^3.6.0",
    "lucide-react": "^0.561.0",
    "date-fns": "^4.1.0",
    "browser-image-compression": "^2.0.2",
    "react-hook-form": "^7.68.0",
    "zod": "^4.2.1",
    "@hookform/resolvers": "^5.2.2",
    "next-themes": "^0.4.6",
    "sonner": "^2.0.7",
    "tailwind-merge": "^3.4.0",
    "tailwindcss-animate": "^1.0.7",
    "uuid": "^13.0.0",
    "class-variance-authority": "^0.7.1",
    "@tanstack/react-query": "^5.90.12",
    "framer-motion": "^12.23.26",
    "vite-plugin-pwa": "^1.2.0"
  },
  "devDependencies": {
    "vite": "^7.3.0",
    "@vitejs/plugin-react-swc": "^4.2.2",
    "tailwindcss": "^4.1.18",
    "@tailwindcss/postcss": "^4.1.18",
    "@tailwindcss/typography": "^0.5.19",
    "postcss": "^8.5.6",
    "typescript": "^5.9.3"
  }
}
```

### **CRITICAL: Framework Version Notes**

#### **Tailwind CSS v4.1.18:**

- ⚠️ **Breaking change from v3:** New CSS-first configuration
- ✅ **Migrations applied:** Check `src/index.css` for current theme setup
- **Usage:**
  - NO `tailwind.config.js` - configuration now in CSS
  - Use `@import "tailwindcss"` in CSS files
  - Reference `src/index.css` for custom utilities, theme variables, and color schemes
  - Stick to Tailwind v4 syntax throughout

**IMPORTANT:** Before making changes, review `src/index.css` to understand:

- Current theme variables
- Custom utility classes
- Color scheme definitions
- Dark mode implementation

#### **React Router v7.11.0:**

- ⚠️ **Breaking change:** Import paths changed
- **OLD (v6):** `import { useNavigate } from 'react-router-dom'`
- **NEW (v7):** `import { useNavigate } from 'react-router'`
- **Key Changes:**
  - All imports now from `'react-router'` instead of `'react-router-dom'`
  - Data APIs available but NOT required for this app
  - Keep routing simple with standard `<Route>` components

#### **Zod v4.2.1:**

- ⚠️ Major version bump from v3
- Use latest Zod v4 syntax for form validations
- Check documentation for any API changes

---

## 🎨 Design System Reference

### **Current Theme:**

- **Primary Color:** Teal/Green (`#10b981` range) - KEEP THIS
- **Default Mode:** Dark theme
- **Theme Toggle:** Light | Dark | System (to be implemented in More section)
- **Typography:** Inter or system default
- **Component Library:** shadcn/ui with Radix UI primitives

### **Spacing & Sizing:**

- **Touch Targets:** Minimum 44px for mobile
- **FAB Size:** 56px diameter (standard Material Design)
- **FAB Elevation:** 8-12px above bottom nav bar
- **Bottom Nav Height:** 64px
- **Border Radius:** Use shadcn defaults (typically 0. 5rem)

### **Transaction Card Design (Current - KEEP):**

- Category icon (circular, colored background)
- Description or category name
- Value (₹ prefix)
- Relative date ("Today", "Yesterday", etc.)
- Tags as small chips
- Adhoc badge if applicable

---

## 📂 Current Project Structure Reference

```
src/
├── components/
│   └── ui/               # shadcn/ui components (existing)
├── lib/
│   └── db. ts            # EXISTING - Dexie database setup (DO NOT RECREATE)
├── types/
│   └── expense.ts       # EXISTING - TypeScript interfaces
├── pages/               # Create if doesn't exist
├── hooks/               # Create if doesn't exist
└── index.css            # EXISTING - Tailwind v4 config (REFERENCE THIS)
```

**CRITICAL:**

- ✅ `src/lib/db.ts` **ALREADY EXISTS** - use existing functions, don't recreate
- ✅ `src/types/expense.ts` **ALREADY EXISTS** - use existing types
- ✅ `src/index.css` **ALREADY EXISTS** - reference for theme/styles

---

## 📊 Existing Database Schema (REFERENCE)

**From `src/lib/db.ts`:** The database is already initialized with these stores:

```typescript
// EXISTING - DO NOT RECREATE
this.version(1).stores({
  expenses: "id, category, date, isAdhoc, *tags, createdAt",
  categories: "id, &name",
  tagMetadata: "tag, count, lastUsed",
});
```

**Available Database Functions (ALREADY IMPLEMENTED):**

- ✅ `addExpense()` - Create expense
- ✅ `updateExpense()` - Update expense
- ✅ `deleteExpense()` - Delete expense
- ✅ `getExpense(id)` - Get single expense by ID
- ✅ `getAllExpenses()` - Get all expenses
- ✅ `addCategory()` - Create category
- ✅ `updateCategory()` - Update category
- ✅ `deleteCategory(id, moveToCategory?)` - Delete with cascade/move
- ✅ `getAllCategories()` - Get all categories
- ✅ `getAllTags()` - Get all tags with metadata
- ✅ `deleteTag()` - Delete tag (unlinks from expenses)
- ✅ `renameTag()` - Rename tag (updates all expenses)
- ✅ `exportAllData()` - Export expenses and categories
- ✅ `importData()` - Import data (with clear and rebuild)

**USE THESE EXISTING FUNCTIONS - DO NOT RECREATE THEM**

---

## ✨ ENHANCEMENT #1: Fix Transaction Click & Edit Mode

### **Problem:**

- Clicking a transaction navigates to `/expense/: id` but shows 404
- No edit functionality currently implemented

### **Solution:**

#### **1. 1 Create Edit Expense Route:**

- **Route:** `/expense/:id`
- **File:** Create `src/pages/EditExpensePage.tsx`
- **Behavior:** Full-page experience (NOT a modal)

#### **1.2 Component Reusability Strategy:**

**Option A: Extend Existing AddExpensePage** (Recommended if you have one)

```typescript
// src/pages/AddExpensePage.tsx (modify existing)
export function AddExpensePage() {
  return <ExpenseForm mode="add" />;
}

// src/pages/EditExpensePage.tsx (NEW)
import { useParams } from "react-router";
import { ExpenseForm } from "@/components/expense/ExpenseForm";

export function EditExpensePage() {
  const { id } = useParams<{ id: string }>();
  return <ExpenseForm mode="edit" expenseId={id} />;
}
```

**Option B: Shared ExpenseForm Component**

```typescript
// src/components/expense/ExpenseForm.tsx (create or modify)
import { getExpense, updateExpense } from "@/lib/db"; // Use existing functions

interface ExpenseFormProps {
  mode: "add" | "edit";
  expenseId?: string; // Required when mode is 'edit'
  onSuccess?: () => void;
}

export function ExpenseForm({ mode, expenseId, onSuccess }: ExpenseFormProps) {
  const [expense, setExpense] = useState<Expense | null>(null);

  useEffect(() => {
    if (mode === "edit" && expenseId) {
      getExpense(expenseId).then(setExpense); // Use existing db function
    }
  }, [mode, expenseId]);

  // ... form logic
}
```

#### **1.3 Edit Page Requirements:**

**Header:**

- Title: **"Edit Expense"** (vs "Add Expense")
- Back button (navigate to previous page)

**Form Fields:**

- Pre-populate ALL fields using `getExpense(id)` from `src/lib/db. ts`
- Same validation rules as Add Expense
- All fields editable

**Actions:**

1. **Save Button:**
   - Call `updateExpense(id, updates)` from `src/lib/db.ts`
   - Show toast: "Expense updated successfully"
   - Navigate back (see logic below)

2. **Delete Button:**
   - Red/destructive styling
   - Confirmation dialog: "Are you sure you want to delete this expense? This action cannot be undone."
   - Call `deleteExpense(id)` from `src/lib/db.ts`
   - Navigate to home

3. **Cancel Button:**
   - Navigate back without saving

#### **1.4 Navigation Logic After Save:**

```typescript
import { useNavigate } from "react-router"; // React Router v7

const navigate = useNavigate();

function handleSave() {
  // Save using existing db function
  await updateExpense(expenseId, formData);

  // Navigate back
  if (window.history.length > 1) {
    navigate(-1); // Go back
  } else {
    navigate("/"); // Fallback to home
  }
}
```

#### **1.5 Router Configuration:**

Add this route to your router config:

```typescript
// In your router setup
import { EditExpensePage } from "@/pages/EditExpensePage";

<Route path="/expense/:id" element={<EditExpensePage />} />;
```

---

## ✨ ENHANCEMENT #2: Redesign Bottom Navigation

### **Current Layout (TO CHANGE):**

```
[ Home ] [ Add ] [ Categories ] [ Analysis ]
                 + FAB
```

### **New Layout:**

```
[ Home ] [ Categories ] [ Analysis ] [ More ]
              🔼 Elevated FAB (+)
```

### **2.1 Bottom Navigation Structure:**

#### **Tab Configuration:**

| Tab        | Icon                      | Label      | Route         |
| ---------- | ------------------------- | ---------- | ------------- |
| Home       | `Home` (Lucide)           | Home       | `/`           |
| Categories | `FolderOpen` or `Layers`  | Categories | `/categories` |
| Analysis   | `BarChart3` or `PieChart` | Analysis   | `/analysis`   |
| More       | `MoreHorizontal`          | More       | `/more`       |

#### **2.2 FAB (Floating Action Button) Implementation:**

**File Location:**

- Either in `src/components/layout/BottomNav.tsx`
- Or separate `src/components/layout/FloatingActionButton.tsx`

**Visual Design:**

- **Position:** Centered horizontally, elevated above bottom nav
- **Elevation:** 8-12px above nav (use transform: `translateY(-8px)`)
- **Size:** 56px × 56px (w-14 h-14)
- **Icon:** `Plus` from `lucide-react`
- **Color:** Use primary color from theme
- **Shadow:** `shadow-lg` (Tailwind)

**Implementation:**

```typescript
// src/components/layout/FloatingActionButton.tsx (NEW FILE)
import { Plus } from "lucide-react";
import { useNavigate } from "react-router";

export function FloatingActionButton() {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate("/add")}
      className="
        fixed
        bottom-20
        left-1/2
        -translate-x-1/2
        w-14 h-14
        rounded-full
        bg-primary
        text-primary-foreground
        shadow-lg
        hover:shadow-xl
        flex items-center justify-center
        transition-all duration-200
        active:scale-95
        z-50
      "
      aria-label="Add expense"
    >
      <Plus className="w-6 h-6" />
    </button>
  );
}
```

**Update Bottom Nav:**

```typescript
// src/components/layout/BottomNav.tsx (MODIFY)
import { Home, Layers, BarChart3, MoreHorizontal } from "lucide-react";
import { useNavigate, useLocation } from "react-router";
import { FloatingActionButton } from "./FloatingActionButton";

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    { path: "/", icon: Home, label: "Home" },
    { path: "/categories", icon: Layers, label: "Categories" },
    { path: "/analysis", icon: BarChart3, label: "Analysis" },
    { path: "/more", icon: MoreHorizontal, label: "More" },
  ];

  return (
    <>
      <FloatingActionButton />

      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-background border-t z-40">
        <div className="flex justify-around items-center h-full">
          {tabs.map((tab) => (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center gap-1 px-4 py-2 ${
                location.pathname === tab.path
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            >
              <tab.icon className="w-5 h-5" />
              <span className="text-xs">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </>
  );
}
```

**Key Changes:**

- ✅ Remove "Add" tab
- ✅ Add "More" tab with `MoreHorizontal` icon
- ✅ FAB rendered above nav (z-50 vs z-40)
- ✅ FAB positioned at `bottom-20` (20 \* 4px = 80px, just above 64px nav)

---

## ✨ ENHANCEMENT #3: "More" Section Implementation

### **3.1 Create More Page:**

**File:** `src/pages/MorePage.tsx` (NEW)

```typescript
import { ThemeSelector } from "@/components/more/ThemeSelector";
import { ExportData } from "@/components/more/ExportData";
import { ImportData } from "@/components/more/ImportData";
import { AboutSection } from "@/components/more/AboutSection";
import { FactoryReset } from "@/components/more/FactoryReset";

export function MorePage() {
  return (
    <div className="container mx-auto p-4 space-y-6 pb-24">
      <h1 className="text-2xl font-bold">More</h1>

      <section>
        <h2 className="text-lg font-semibold mb-3">🎨 Appearance</h2>
        <ThemeSelector />
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">📤 Data Management</h2>
        <ExportData />
        <ImportData />
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">ℹ️ About</h2>
        <AboutSection />
      </section>

      <section>
        <h2 className="text-lg font-semibold text-destructive mb-3">
          ⚠️ Danger Zone
        </h2>
        <FactoryReset />
      </section>
    </div>
  );
}
```

**Add Route:**

```typescript
<Route path="/more" element={<MorePage />} />
```

---

### **3.2 Feature Components:**

#### **3.2.1 Theme Selector**

**File:** `src/components/more/ThemeSelector.tsx` (NEW)

```typescript
import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();

  const themes = [
    { value: "light", icon: Sun, label: "Light" },
    { value: "dark", icon: Moon, label: "Dark" },
    { value: "system", icon: Monitor, label: "System" },
  ];

  return (
    <div className="flex gap-2 p-1 bg-muted rounded-lg">
      {themes.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          className={`
            flex-1 flex items-center justify-center gap-2
            px-4 py-3 rounded-md transition-all
            ${
              theme === value
                ? "bg-primary text-primary-foreground"
                : "hover:bg-background"
            }
          `}
        >
          <Icon className="w-4 h-4" />
          <span className="text-sm font-medium">{label}</span>
        </button>
      ))}
    </div>
  );
}
```

---

#### **3.2.2 Export Data**

**File:** `src/components/more/ExportData.tsx` (NEW)

```typescript
import { useState } from "react";
import { Download } from "lucide-react";
import { exportAllData } from "@/lib/db"; // Use existing function
import { toast } from "sonner";

export function ExportData() {
  const [format, setFormat] = useState<"csv" | "json">("csv");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  async function handleExport() {
    try {
      const data = await exportAllData(); // Use existing db function

      // Filter by date range if provided
      let expenses = data.expenses;
      if (fromDate && toDate) {
        expenses = expenses.filter(
          (e) => e.date >= fromDate && e.date <= toDate
        );
      }

      if (format === "csv") {
        const csv = generateCSV(expenses, data.categories);
        downloadFile(csv, `expenses-${Date.now()}.csv`, "text/csv");
      } else {
        const json = JSON.stringify(
          {
            exportDate: new Date().toISOString(),
            version: "1.0",
            expenses,
            categories: data.categories,
          },
          null,
          2
        );
        downloadFile(json, `expenses-${Date.now()}.json`, "application/json");
      }

      toast.success(`Exported ${expenses.length} expenses`);
    } catch (error) {
      toast.error("Export failed");
    }
  }

  return (
    <div className="border rounded-lg p-4 space-y-4">
      <h3 className="font-semibold">Export Data</h3>

      <div className="space-y-2">
        <label className="text-sm">Date Range (Optional)</label>
        <div className="flex gap-2">
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="flex-1 px-3 py-2 border rounded"
          />
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="flex-1 px-3 py-2 border rounded"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm">Format</label>
        <div className="flex gap-2">
          <button
            onClick={() => setFormat("csv")}
            className={`flex-1 py-2 rounded ${
              format === "csv"
                ? "bg-primary text-primary-foreground"
                : "bg-muted"
            }`}
          >
            CSV
          </button>
          <button
            onClick={() => setFormat("json")}
            className={`flex-1 py-2 rounded ${
              format === "json"
                ? "bg-primary text-primary-foreground"
                : "bg-muted"
            }`}
          >
            JSON
          </button>
        </div>
      </div>

      <button
        onClick={handleExport}
        className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2 rounded"
      >
        <Download className="w-4 h-4" />
        Export Data
      </button>
    </div>
  );
}

// Helper functions
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
    e.description || "",
    e.value,
    e.tags.join(";"),
    e.isAdhoc,
    e.attachment ? "[base64]" : "",
  ]);

  return [headers, ...rows].map((row) => row.join(",")).join("\n");
}

function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
```

---

#### **3.2.3 Import Data**

**File:** `src/components/more/ImportData. tsx` (NEW)

```typescript
import { useState } from 'react';
import { Upload } from 'lucide-react';
import { importData } from '@/lib/db'; // Use existing function
import { toast } from 'sonner';

export function ImportData() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any>(null);
  const [mode, setMode] = useState<'merge' | 'override'>('merge');

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files? .[0];
    if (! selectedFile) return;

    try {
      const text = await selectedFile.text();
      const data = JSON.parse(text);

      // Validate structure
      if (!data. expenses || !data.categories) {
        throw new Error('Invalid backup file');
      }

      setFile(selectedFile);
      setPreview({
        expenseCount: data.expenses.length,
        categoryCount: data.categories. length,
        dateRange: {
          earliest: data.expenses[0]?.date || 'N/A',
          latest: data.expenses[data.expenses.length - 1]?.date || 'N/A'
        }
      });
    } catch (error) {
      toast.error('Invalid backup file');
    }
  }

  async function handleImport() {
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (mode === 'override') {
        // Use existing importData function (it clears by default)
        await importData(data);
      } else {
        // Merge mode:  manually add without clearing
        // (You may need to create a new function in db.ts for merge mode)
        // For now, call importData which does override
        await importData(data);
      }

      toast.success('Data imported successfully');
      setFile(null);
      setPreview(null);
    } catch (error) {
      toast.error('Import failed');
    }
  }

  if (!preview) {
    return (
      <div className="border rounded-lg p-4">
        <h3 className="font-semibold mb-3">Import Backup</h3>
        <input
          type="file"
          accept=".json"
          onChange={handleFileSelect}
          className="w-full"
        />
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-4 space-y-4">
      <h3 className="font-semibold">Import Preview</h3>

      <div className="bg-muted p-3 rounded space-y-1 text-sm">
        <p>📊 {preview.expenseCount} expenses</p>
        <p>📁 {preview.categoryCount} categories</p>
        <p>📅 {preview.dateRange. earliest} to {preview.dateRange.latest}</p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Import Mode</label>
        <div className="space-y-2">
          <label className="flex items-start gap-2">
            <input
              type="radio"
              checked={mode === 'merge'}
              onChange={() => setMode('merge')}
            />
            <div>
              <div className="font-medium">Merge (Safe)</div>
              <div className="text-xs text-muted-foreground">
                Combine with existing data
              </div>
            </div>
          </label>

          <label className="flex items-start gap-2">
            <input
              type="radio"
              checked={mode === 'override'}
              onChange={() => setMode('override')}
            />
            <div>
              <div className="font-medium text-destructive">Override (Destructive)</div>
              <div className="text-xs text-muted-foreground">
                Delete all existing data
              </div>
            </div>
          </label>
        </div>
      </div>

      <button
        onClick={handleImport}
        className="w-full bg-primary text-primary-foreground py-2 rounded"
      >
        Confirm Import
      </button>
    </div>
  );
}
```

**NOTE:** The existing `importData()` function in `src/lib/db.ts` does an override by default (clears all data). For merge mode, you may need to add a new function:

```typescript
// Add to src/lib/db.ts
export async function mergeImportData(data: {
  expenses: Expense[];
  categories: Category[];
}): Promise<void> {
  await db.transaction("rw", [db.expenses, db.categories, db.tagMetadata], async () => {
    // Import categories (skip if already exists)
    for (const category of data.categories) {
      const exists = await db.categories.get(category.id);
      if (!exists) {
        await db.categories.add(category);
      }
    }

    // Import expenses (skip if already exists)
    for (const expense of data.expenses) {
      const exists = await db.expenses.get(expense.id);
      if (!exists) {
        await db.expenses.add(expense);
      }
    }

    // Rebuild tag metadata
    // ...  (similar to importData)
  });
}
```

---

#### **3.2.4 About Section**

**File:** `src/components/more/AboutSection. tsx` (NEW)

```typescript
import { Github } from "lucide-react";

export function AboutSection() {
  return (
    <div className="border rounded-lg p-6 space-y-4 text-center">
      <div className="text-4xl">💰</div>
      <h3 className="text-xl font-bold">Expense Tracker</h3>

      <div className="text-sm text-muted-foreground space-y-1">
        <p>Version v0.0.1</p>
        <p>Last Updated: December 2025</p>
      </div>

      <div className="pt-2">
        <p className="text-sm font-medium">Created by</p>
        <p className="text-lg">Madhusoodhanan KM</p>
      </div>

      <a
        href="https://github.com/gammaSpeck"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 text-primary hover:underline"
      >
        <Github className="w-5 h-5" />
        <span>github.com/gammaSpeck</span>
      </a>

      <div className="pt-4 border-t space-y-3 text-sm text-left">
        <p>
          This expense manager was created to be open-source and free, because
          all other apps want to monetize themselves.
        </p>

        <div className="space-y-2">
          <p className="font-semibold flex items-center gap-2">
            🔒 Fully Local & Private
          </p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>No backend server exists</li>
            <li>All data stored on your device</li>
            <li>No tracking, no analytics</li>
            <li>Your data never leaves your phone</li>
          </ul>
        </div>

        <div className="space-y-2">
          <p className="font-semibold flex items-center gap-2">
            📂 Open Source
          </p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>MIT Licensed</li>
            <li>Contributions welcome</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
```

---

#### **3.2.5 Factory Reset**

**File:** `src/components/more/FactoryReset.tsx` (NEW)

```typescript
import { useState } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { db, initializeDatabase } from "@/lib/db";
import { toast } from "sonner";
import { useNavigate } from "react-router";

export function FactoryReset() {
  const [showWarning, setShowWarning] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const navigate = useNavigate();

  async function handleFactoryReset() {
    if (confirmText !== "DELETE ALL DATA") {
      toast.error("Please type the confirmation text correctly");
      return;
    }

    try {
      // Clear all data
      await db.expenses.clear();
      await db.categories.clear();
      await db.tagMetadata.clear();

      // Clear localStorage
      localStorage.clear();

      // Re-seed default categories
      await initializeDatabase();

      toast.success("All data cleared.  App reset to default state.");
      setShowWarning(false);
      setShowConfirm(false);
      navigate("/");
    } catch (error) {
      toast.error("Factory reset failed");
    }
  }

  if (showConfirm) {
    return (
      <div className="border-2 border-destructive rounded-lg p-4 space-y-4">
        <div className="flex items-center gap-2 text-destructive font-semibold">
          <AlertTriangle className="w-5 h-5" />
          Final Confirmation
        </div>

        <p className="text-sm">
          Type <strong>DELETE ALL DATA</strong> to confirm:
        </p>

        <input
          type="text"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          className="w-full px-3 py-2 border rounded"
          placeholder="DELETE ALL DATA"
        />

        <div className="flex gap-2">
          <button
            onClick={() => setShowConfirm(false)}
            className="flex-1 py-2 border rounded"
          >
            Cancel
          </button>
          <button
            onClick={handleFactoryReset}
            disabled={confirmText !== "DELETE ALL DATA"}
            className="flex-1 py-2 bg-destructive text-destructive-foreground rounded disabled:opacity-50"
          >
            Confirm Factory Reset
          </button>
        </div>
      </div>
    );
  }

  if (showWarning) {
    return (
      <div className="border-2 border-destructive rounded-lg p-4 space-y-4">
        <div className="flex items-center gap-2 text-destructive font-semibold">
          <AlertTriangle className="w-5 h-5" />
          Factory Reset Warning
        </div>

        <div className="space-y-3 text-sm">
          <p>This will permanently delete: </p>
          <ul className="list-disc list-inside space-y-1">
            <li>All expenses</li>
            <li>All categories</li>
            <li>All tags</li>
            <li>Theme preferences</li>
          </ul>

          <div className="bg-destructive/10 p-3 rounded">
            <p className="font-semibold text-destructive">
              🔴 This action CANNOT be undone!
            </p>
          </div>

          <div className="bg-muted p-3 rounded">
            <p className="font-semibold">💡 Backup Reminder: </p>
            <p className="text-muted-foreground">
              Before proceeding, we recommend backing up your data using the
              Export feature above.
            </p>
            <p className="text-muted-foreground mt-2">
              No copy of your data exists on any server or cloud storage. Once
              deleted, it's gone forever.
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowWarning(false)}
            className="flex-1 py-2 border rounded"
          >
            Cancel
          </button>
          <button
            onClick={() => setShowConfirm(true)}
            className="flex-1 py-2 bg-destructive text-destructive-foreground rounded"
          >
            I Understand, Proceed →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="border-2 border-destructive rounded-lg p-4">
      <h3 className="font-semibold text-destructive mb-2">Clear All Data</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Permanently delete all expenses, categories, and settings
      </p>

      <button
        onClick={() => setShowWarning(true)}
        className="w-full flex items-center justify-center gap-2 py-2 bg-destructive text-destructive-foreground rounded"
      >
        <Trash2 className="w-4 h-4" />
        Factory Reset
      </button>
    </div>
  );
}
```

---

## ✨ ENHANCEMENT #4: Categories + Tags Management

### **4.1 Update Categories Page Structure:**

**File:** `src/pages/CategoriesPage.tsx` (MODIFY EXISTING)

```typescript
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CategoryTab } from "@/components/categories/CategoryTab";
import { TagTab } from "@/components/categories/TagTab";

export function CategoriesPage() {
  return (
    <div className="container mx-auto p-4 pb-24">
      <h1 className="text-2xl font-bold mb-4">Categories & Tags</h1>

      <Tabs defaultValue="categories">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="categories">📁 Categories</TabsTrigger>
          <TabsTrigger value="tags">🏷️ Tags</TabsTrigger>
        </TabsList>

        <TabsContent value="categories">
          <CategoryTab />
        </TabsContent>

        <TabsContent value="tags">
          <TagTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

---

### **4.2 Category Tab (Extract Existing)**

**File:** `src/components/categories/CategoryTab.tsx` (EXTRACT from existing page)

```typescript
// Move existing category management UI here
// Keep all existing functionality:
// - Category grid/list
// - Add/Edit/Delete category
// - Icon picker
// - Color picker
// - Usage counts

export function CategoryTab() {
  // ... existing category management code
  return <div>{/* Existing category UI */}</div>;
}
```

---

### **4.3 Tag Tab (NEW)**

**File:** `src/components/categories/TagTab.tsx` (NEW)

```typescript
import { useEffect, useState } from "react";
import { getAllTags, deleteTag, renameTag } from "@/lib/db"; // Use existing functions
import { TagMetadata } from "@/types/expense";
import { Trash2, Edit2, Tag } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router";

export function TagTab() {
  const [tags, setTags] = useState<TagMetadata[]>([]);
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    loadTags();
  }, []);

  async function loadTags() {
    const allTags = await getAllTags(); // Use existing function
    setTags(allTags);
  }

  async function handleDelete(tag: string) {
    const tagData = tags.find((t) => t.tag === tag);
    if (!tagData) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete the tag "${tag}"?\n\n` +
        `This tag is used in ${tagData.count} expenses.\n\n` +
        `The tag will be removed from all expenses, but the expenses themselves will NOT be deleted.`
    );

    if (confirmed) {
      await deleteTag(tag); // Use existing function
      toast.success(`Tag "${tag}" deleted`);
      loadTags();
    }
  }

  async function handleRename(oldTag: string) {
    if (!newName || newName === oldTag) {
      setEditingTag(null);
      return;
    }

    await renameTag(oldTag, newName); // Use existing function
    toast.success(`Tag renamed to "${newName}"`);
    setEditingTag(null);
    setNewName("");
    loadTags();
  }

  function handleTagClick(tag: string) {
    navigate("/transactions", { state: { filterTag: tag } });
  }

  if (tags.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Tag className="w-16 h-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No tags created yet</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          Tags are automatically created when you add them to expenses
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2 mt-4">
      {tags.map((tagData) => (
        <div
          key={tagData.tag}
          className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
        >
          {editingTag === tagData.tag ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onBlur={() => handleRename(tagData.tag)}
                onKeyDown={(e) =>
                  e.key === "Enter" && handleRename(tagData.tag)
                }
                className="flex-1 px-3 py-1 border rounded"
                autoFocus
              />
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div
                onClick={() => handleTagClick(tagData.tag)}
                className="flex-1 cursor-pointer"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Tag className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{tagData.tag}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Used in {tagData.count} expense
                  {tagData.count !== 1 ? "s" : ""}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setEditingTag(tagData.tag);
                    setNewName(tagData.tag);
                  }}
                  className="p-2 hover:bg-muted rounded"
                  aria-label="Rename tag"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(tagData.tag)}
                  className="p-2 hover:bg-destructive/10 text-destructive rounded"
                  aria-label="Delete tag"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
```

**Key Features:**

- ✅ Lists all tags sorted by usage count (uses existing `getAllTags()`)
- ✅ Shows usage count per tag
- ✅ Click tag → navigate to filtered transactions
- ✅ Rename tag inline (uses existing `renameTag()`)
- ✅ Delete tag with confirmation (uses existing `deleteTag()`)
- ✅ Empty state message

---

## 📁 Complete File Structure After Changes

```
src/
├── components/
│   ├── ui/                          # shadcn/ui components (EXISTING - keep all)
│   │
│   ├── layout/                      # Layout components
│   │   ├── BottomNav.tsx           # MODIFY - update tabs, remove Add
│   │   └── FloatingActionButton.tsx # NEW - elevated FAB
│   │
│   ├── expense/
│   │   └── ExpenseForm.tsx         # MODIFY - support add/edit modes
│   │
│   ├── categories/
│   │   ├── CategoryTab.tsx         # EXTRACT from existing page
│   │   └── TagTab.tsx              # NEW - tag management
│   │
│   └── more/
│       ├── ThemeSelector.tsx       # NEW - theme toggle
│       ├── ExportData.tsx          # NEW - export with date range
│       ├── ImportData.tsx          # NEW - import with preview
│       ├── AboutSection.tsx        # NEW - about app
│       └── FactoryReset.tsx        # NEW - clear all data
│
├── pages/
│   ├── EditExpensePage.tsx         # NEW - edit expense full page
│   ├── MorePage.tsx                # NEW - settings/more page
│   └── CategoriesPage.tsx          # MODIFY - add tabs for categories/tags
│
├── lib/
│   └── db.ts                       # EXISTING - use functions, add mergeImportData()
│
├── types/
│   └── expense.ts                  # EXISTING - use types
│
├── hooks/                           # Create if needed for custom hooks
│
└── index.css                        # EXISTING - reference for theme (DO NOT MODIFY)
```

---

## 🧪 Testing Checklist

### **Enhancement #1 - Edit Expense:**

- [ ] Click transaction → navigates to `/expense/: id`
- [ ] Edit page loads with pre-filled data from `getExpense()`
- [ ] All fields editable
- [ ] Save calls `updateExpense()` and navigates back
- [ ] Delete calls `deleteExpense()` with confirmation
- [ ] Cancel navigates back without saving

### **Enhancement #2 - Bottom Nav:**

- [ ] Bottom nav shows: Home | Categories | Analysis | More
- [ ] "Add" tab removed
- [ ] FAB centered and elevated above nav
- [ ] FAB click navigates to `/add`
- [ ] FAB has drop shadow

### **Enhancement #3 - More Section:**

- [ ] Theme selector toggles Light/Dark/System
- [ ] Export shows date range picker
- [ ] Export CSV downloads correct format
- [ ] Export JSON downloads correct format
- [ ] Import shows file picker
- [ ] Import shows preview with counts
- [ ] Import Override clears all data (uses `importData()`)
- [ ] Import Merge combines data (uses new `mergeImportData()`)
- [ ] About section displays correct info
- [ ] GitHub link opens in new tab
- [ ] Factory reset shows two-step confirmation
- [ ] Factory reset clears all data and reseeds defaults

### **Enhancement #4 - Tags:**

- [ ] Categories page has tabs: Categories | Tags
- [ ] Tags tab shows all tags (uses `getAllTags()`)
- [ ] Tags sorted by usage count
- [ ] Rename tag updates all expenses (uses `renameTag()`)
- [ ] Delete tag shows confirmation (uses `deleteTag()`)
- [ ] Delete tag removes from expenses (NOT delete expenses)
- [ ] Click tag navigates to filtered transactions
- [ ] Empty state shows when no tags exist

---

## 🎯 Implementation Priority

1. **Enhancement #2** (Bottom Nav) - Foundation
2. **Enhancement #1** (Edit Expense) - Core functionality
3. **Enhancement #4** (Tags Tab) - Extends existing page
4. **Enhancement #3** (More Section) - Complex, do last

---

## 📝 Key Reminders for Lovable

1. ✅ **Use existing `src/lib/db.ts` functions** - DO NOT recreate database logic
2. ✅ **Reference `src/index.css`** for theme and styling
3. ✅ **Import from `'react-router'`** (NOT `'react-router-dom'`)
4. ✅ **Use Tailwind v4 syntax** (no tailwind. config.js)
5. ✅ **Reuse existing types** from `src/types/expense.ts`
6. ✅ **All destructive actions** need confirmation dialogs
7. ✅ **Mobile-first design** with 44px minimum touch targets

---

## 🚀 Version Info

- **Version:** v0.0.2
- **Base Version:** v0.0.1
- **Created:** 2025-12-18
- **Author:** Madhusoodhanan KM (@gammaSpeck)
- **Target Platform:** Lovable. dev

---

**END OF ENHANCEMENT SPECIFICATION**
