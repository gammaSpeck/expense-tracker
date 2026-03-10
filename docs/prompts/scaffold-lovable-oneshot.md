# 🎯 ONE-SHOT PROMPT FOR EXPENSE MANAGER APP

## 📋 CONTEXT

You are building a **Personal Expense Tracker** - a fully offline, browser-based Progressive Web Application (PWA) for individuals to track and analyze their personal expenses. No backend, no authentication, no income tracking - just pure expense management with local data persistence.

**Target Users:** Individuals who want a simple, privacy-first expense tracker that works entirely offline on mobile and desktop.

---

## 🏗️ TECHNICAL ARCHITECTURE

### **Core Stack:**

- **Framework:** Vite + React (TypeScript)
- **UI Library:** shadcn/ui with base UI components
- **Icons:** Lucide React (built-in shadcn compatibility)
- **Database:** IndexedDB via Dexie.js for offline-first data persistence
- **PWA:** Vite PWA plugin (`vite-plugin-pwa`) with auto-generated splash screens and offline support
- **Charts:** Recharts (works well with React/shadcn)
- **Image Compression:** browser-image-compression library for attachment handling
- **Styling:** Tailwind CSS (shadcn default)
- **Date/Time:** date-fns for date manipulation

### **Key Constraints:**

- ✅ No backend - fully client-side
- ✅ No authentication/user management
- ✅ All data stored in IndexedDB (Dexie.js)
- ✅ Mobile-first responsive design
- ✅ Offline-first with PWA support
- ✅ Dark mode default with light mode and system preference toggle
- ✅ Must work as installable PWA on mobile and desktop

---

## 📊 DATA MODEL

### **1. Expense Schema:**

```typescript
interface Expense {
  id: string; // UUID
  value: number; // Required, positive only, max 10000000 (1 Crore), prefixed with ₹ in UI
  category: string; // Required, references Category. id, default "others"
  description?: string; // Optional
  tags: string[]; // Optional, max 4 tags per expense
  date: string; // Required, ISO date string, default today
  time: string; // Required, HH:mm format, default now
  isAdhoc: boolean; // Default false - marks expense as adhoc (vacations, big purchases)
  attachment?: string; // Optional, base64 encoded image, max 500KB after compression
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}
```

### **2. Category Schema:**

```typescript
interface Category {
  id: string; // UUID
  name: string; // Required, unique
  icon: string; // Lucide icon name
  color: string; // Hex color code
  createdAt: string;
}
```

### **3. Tag Management:**

- Tags are freeform strings
- Track tag usage frequency for smart suggestions
- Create a separate IndexedDB table to store tag metadata (usage count)

### **Default Categories (seed on first launch):**

1. **Food & Dining** - icon: `UtensilsCrossed`, random color from palette
2. **Shopping** - icon: `ShoppingBag`, random color from palette
3. **Transport** - icon: `Car`, random color from palette
4. **Medical** - icon: `Heart`, random color from palette
5. **Bills** - icon: `FileText`, random color from palette
6. **Entertainment** - icon: `Tv`, random color from palette
7. **Others** (default, cannot be deleted) - icon: `MoreHorizontal`, neutral color

### **Color Palette (36 colors):**

Provide 36 distinct, vibrant colors suitable for both light and dark modes. Each category icon should:

- Be displayed in a **circular background** with the color at 20% opacity
- Icon itself uses the same color at 100% opacity for contrast

Example colors (generate 36 total):
`#EF4444, #F97316, #F59E0B, #EAB308, #84CC16, #22C55E, #10B981, #14B8A6, #06B6D4, #0EA5E9, #3B82F6, #6366F1, #8B5CF6, #A855F7, #D946EF, #EC4899, #F43F5E, #64748B, #0F172A, #DC2626, #EA580C, #D97706, #CA8A04, #65A30D, #16A34A, #059669, #0D9488, #0891B2, #0284C7, #2563EB, #4F46E5, #7C3AED, #9333EA, #C026D3, #DB2777, #E11D48`

---

## 🎨 UI/UX DESIGN REQUIREMENTS

### **Layout Structure:**

- **Mobile-first design** with bottom navigation bar (4 tabs)
- Desktop: Responsive with sidebar navigation (left side)
- **Bottom Nav Tabs:** Home | Add Expense | Categories | Analysis

### **Theme:**

- **Default:** Dark mode
- Toggle: Light / Dark / System preference (use shadcn theme provider)
- Smooth transitions between themes

### **Design Principles:**

- Clean, modern, minimalist interface
- Large touch targets (minimum 44px) for mobile
- Smooth animations and transitions
- Clear visual hierarchy
- Accessible (WCAG 2.1 AA compliant)

---

## ✨ FEATURE SPECIFICATIONS

### **FEATURE 1: EXPENSE CRUD (Core Functionality)**

#### **Add Expense Screen:**

- **Route:** `/add` or modal overlay
- **Form Fields:**
  1. **Value** (required)
     - Number input, prefixed with `₹` symbol
     - Validation: Must be positive, max 1 Crore (10,000,000)
     - Auto-focus on load
  2. **Category** (required)
     - Dropdown/select with category icons and colors
     - Show "Create New Category" option at bottom
     - Default: "Others"
  3. **Description** (optional)
     - Text input/textarea
     - As user types, show **smart tag suggestions** based on previously used tags
  4. **Tags** (optional)
     - Multi-select chips/badges
     - Max 4 tags
     - Show suggestions based on description keywords and frequently used tags
     - Allow creating new tags on the fly
  5. **Date** (required)
     - Date picker, default: today
  6. **Time** (required)
     - Time picker, default: current time
  7. **Is Adhoc Expense** (optional)
     - Checkbox/toggle
     - Default: unchecked
     - Helper text: "Exclude from monthly analysis (vacations, big purchases)"
  8. **Attachment** (optional)
     - Image upload button
     - On upload: compress to max 500KB, convert to base64
     - Show thumbnail preview with remove option
     - Max 1 attachment per expense

- **Actions:**
  - "Save" button (primary CTA)
  - "Cancel" button
  - Show success toast on save
  - Clear form after successful save

#### **Edit Expense:**

- Click any expense from list → open in edit mode (same form, pre-filled)
- Show "Update" and "Delete" buttons
- Delete shows confirmation dialog: "Are you sure you want to delete this expense? This action cannot be undone."

#### **Duplicate Expense:**

- **Long-press** any expense card → show context menu with "Duplicate" option
- On duplicate:
  - Copy all fields (value, category, description, tags, isAdhoc, attachment)
  - Update date to today
  - Update time to current time
  - Open in "Add Expense" form with pre-filled data
  - User can modify before saving

#### **Delete Expense:**

- Confirmation dialog required
- Permanently remove from IndexedDB

#### **View Expense Details:**

- Click expense → show modal/drawer with all details
- If attachment exists, show thumbnail; clicking opens full-size image in modal

---

### **FEATURE 2: CATEGORY CRUD**

#### **Categories Screen:**

- **Route:** `/categories`
- Display all categories as a grid/list with:
  - Circular icon background (color at 20% opacity)
  - Icon (color at 100%)
  - Category name
  - Number of expenses tagged to this category

#### **Add Category:**

- Modal/drawer form with:
  1. **Name** (required, unique validation)
  2. **Icon picker:** Searchable grid of Lucide icons (at least 100+ common icons)
  3. **Color picker:** Grid of 36 predefined colors
- "Save" button creates category

#### **Edit Category:**

- Click category → open edit form (same as add)
- Can update name, icon, color

#### **Delete Category:**

- Show confirmation dialog with two options:
  1. **Move expenses to another category** (default selection)
     - Dropdown to select target category
     - Default target: "Others"
  2. **Cascade delete all expenses** in this category
- Cannot delete "Others" category (show error message)
- Confirmation: "This will affect X expenses. Are you sure?"

#### **Create Category on the Fly:**

- When adding/editing expense, user can click "Create New Category" from category dropdown
- Opens inline mini-form (name, icon, color) → saves → immediately selects new category

---

### **FEATURE 3: TAG MANAGEMENT**

#### **Tags Screen:**

- **Route:** `/tags`
- List all tags ever used with:
  - Tag name
  - Usage count (number of expenses with this tag)
- Click tag → show all expenses with that tag
- Can rename or delete tags
- Delete confirmation: "X expenses use this tag. Remove tag from all expenses?"

#### **Smart Tag Suggestions:**

- When user types in description field while adding expense:
  - Analyze description text for keywords
  - Suggest matching tags from previously used tags
  - Show top 5 suggestions as clickable chips below description field
- When user selects a tag, add to tags array (max 4)

---

### **FEATURE 4: HOME DASHBOARD**

#### **Route:** `/` (default)

**Layout:**

1. **Header Section:**
   - App title/logo
   - Theme toggle button (sun/moon icon)
   - Settings/menu icon (future use)

2. **Monthly Summary Card:**
   - Large display: "This Month's Expenses: ₹XX,XXX"
   - Subtitle: "Excluding Adhoc: ₹XX,XXX" (smaller text)
   - Date range: "1 Dec - 17 Dec 2025"

3. **Search Bar:**
   - Placed prominently at the top of the transactions section
   - Filters expenses in real-time by:
     - Description (partial match)
     - Category name (partial match)
     - Tags (exact match)
   - Show clear button (X) when text is entered
   - Placeholder: "Search by description, category, or tag..."

4. **Recent Transactions Section:**
   - Title: "Recent Transactions"
   - List of last 10 expenses, each showing:
     - Category icon (circular, colored)
     - Description (or category name if no description)
     - Value (₹XXX)
     - Date (relative: "Today", "Yesterday", "3 days ago")
     - Tags (small chips/badges)
     - Adhoc indicator (small badge if true)
   - Click expense → open expense detail modal
   - **Long-press expense** → show context menu with "Duplicate" option
   - Bottom: "See All Transactions" button → navigates to full list

5. **Quick Add Button:**
   - Large, floating action button (FAB) at bottom-right
   - Icon: Plus sign
   - Opens Add Expense screen/modal

---

### **FEATURE 5: ALL TRANSACTIONS LIST**

#### **Route:** `/transactions`

**Features:**

1. **Search Bar:**
   - Fixed at top of screen (sticky)
   - Same functionality as home screen search
   - Filters the entire transaction list in real-time
   - Search by: description, category name, tags
   - Show result count: "Showing X of Y transactions"

2. **Transaction List:**
   - Display ALL expenses in reverse chronological order (newest first)
   - **Grouping by date:** "Today", "Yesterday", "This Week", "Last Week", "December 2025", etc.
   - Each expense card shows:
     - Category icon + color
     - Value (₹XXX)
     - Description
     - Tags
     - Date & time
     - Adhoc badge (if applicable)
     - Attachment indicator icon (if exists)

**Filters & Search:**

- Search bar at top (filters by description, category, tags)
- Filter buttons:
  - Date range picker
  - Category multi-select
  - Include/Exclude Adhoc toggle
  - Tag filter

**Pagination:**

- Infinite scroll (load 50 at a time) for performance with large datasets

**Actions:**

- Click expense → view details
- **Long-press expense** → show context menu with options:
  - "Duplicate" (primary action)
  - "Edit"
  - "Delete"
- "Export as CSV" button at top

---

### **FEATURE 6: ANALYSIS & CHARTS**

#### **Route:** `/analysis`

**Layout:**

1. **Filter Section (top):**
   - **Time Period Selector:**
     - Tabs/Buttons: "Week" | "Month" | "Year" | "Custom"
     - Default: "Month" (current month)
     - Custom: Date range picker (from - to)
   - **Adhoc Expenses Toggle:**
     - Checkbox: "Exclude Adhoc Expenses"
     - Default: Checked (enabled)
   - **"Show active filters"** badge/chip section showing current selections
     - e.g., "December 2025 | Excluding Adhoc"

2. **Summary Stats Cards:**
   - Total Expenses (₹XXX)
   - Number of Transactions
   - Average Expense (₹XXX)
   - Top Category (name + % of total)

3. **Pie Chart - Category Breakdown:**
   - **Chart:** Pie/Donut chart showing percentage breakdown by category
   - Use category colors for segments
   - Legend on right/bottom showing:
     - Category icon + name
     - Amount (₹XXX)
     - Percentage (XX%)
   - Click segment → show expenses in that category for selected period
   - Responsive: donut on desktop, pie on mobile

4. **Bar Chart - Spending Trends:**
   - **Chart:** Bar chart showing spending over time
   - X-axis: Time period (days for week view, weeks for month, months for year)
   - Y-axis: Total expenses (₹)
   - Tooltip on hover: Date + Total amount
   - Color: Use primary accent color
   - Show trend line (optional)

5. **Export Button:**
   - "Export Data" button → opens export modal

---

### **FEATURE 7: DATA EXPORT**

#### **Export Modal:**

- Triggered from Analysis or Transactions screen
- **Options:**
  1. **Format:**
     - CSV (default)
     - JSON
  2. **Scope:**
     - "All Data" (default)
     - "Respect Current Filters" (if triggered from filtered view)
  3. **Include Attachments:**
     - Checkbox: "Include base64 attachments" (default: unchecked for CSV)

#### **CSV Export Format:**

```csv
Date,Time,Category,Description,Value,Tags,IsAdhoc,Attachment
2025-12-17,14:30,Food & Dining,Lunch at cafe,450,"food,lunch",false,""
2025-12-16,09:15,Transport,Uber to office,120,"transport,work",false,[base64_truncated]
```

#### **JSON Export Format:**

```json
{
  "exportDate": "2025-12-17T14:30:00Z",
  "expenses": [
    /* array of expense objects */
  ],
  "categories": [
    /* array of category objects */
  ]
}
```

#### **Import (Good to Have):**

- Import JSON file to restore data
- Show confirmation: "This will overwrite existing data. Proceed?"
- Validate JSON structure before import

---

### **FEATURE 8: PWA CONFIGURATION**

#### **PWA Features:**

- **Offline Support:** Full functionality works offline (IndexedDB persists)
- **Installable:** Add to home screen on mobile, install on desktop
- **Update Notification:**
  - When new version available, show banner at top: "New version available. Refresh to update."
  - Button: "Refresh Now"
- **Manifest:**
  - App name: "Expense Tracker"
  - Short name: "Expenses"
  - Theme color: Match primary color
  - Background color: Match dark theme background
  - Display: standalone
  - Auto-generate icons and splash screens (use Vite PWA plugin)

#### **Service Worker:**

- Cache-first strategy for app shell
- Network-first for dynamic data (not applicable since no network)
- Workbox via vite-plugin-pwa

---

## 🛠️ IMPLEMENTATION DETAILS

### **Dexie.js Database Setup:**

```typescript
// db.ts
import Dexie, { Table } from "dexie";

interface Expense {
  id: string;
  value: number;
  category: string;
  description?: string;
  tags: string[];
  date: string;
  time: string;
  isAdhoc: boolean;
  attachment?: string;
  createdAt: string;
  updatedAt: string;
}

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  createdAt: string;
}

interface TagMetadata {
  tag: string;
  count: number;
}

class ExpenseDatabase extends Dexie {
  expenses!: Table<Expense, string>;
  categories!: Table<Category, string>;
  tagMetadata!: Table<TagMetadata, string>;

  constructor() {
    super("ExpenseTrackerDB");
    this.version(1).stores({
      expenses: "id, category, date, isAdhoc, *tags",
      categories: "id, &name",
      tagMetadata: "tag",
    });
  }
}

export const db = new ExpenseDatabase();
```

### **Image Compression:**

```typescript
import imageCompression from "browser-image-compression";

async function compressImage(file: File): Promise<string> {
  const options = {
    maxSizeMB: 0.5, // 500KB
    maxWidthOrHeight: 1920,
    useWebWorker: true,
  };
  const compressed = await imageCompression(file, options);
  return await toBase64(compressed);
}
```

### **Routing:**

Use React Router with these routes:

- `/` - Home Dashboard
- `/add` - Add Expense (or modal)
- `/transactions` - All Transactions List
- `/categories` - Category Management
- `/tags` - Tag Management
- `/analysis` - Analysis & Charts

### **State Management:**

- Use React Context + Hooks for global state (theme, expenses, categories)
- Or use Zustand for simpler state management (optional)

### **Form Validation:**

- Use React Hook Form + Zod for type-safe validation
- Validation rules:
  - Value: required, positive number, max 10000000
  - Category: required
  - Tags: max 4 items
  - Date/Time: valid date/time format

---

## 📱 RESPONSIVE DESIGN BREAKPOINTS

```css
/* Mobile:  < 768px */
- Bottom navigation (4 tabs)
- Single column layout
- Full-width cards
- FAB for quick add

/* Tablet: 768px - 1024px */
- Bottom nav or side nav
- Two-column grid for categories
- Larger charts

/* Desktop: > 1024px */
- Sidebar navigation (left)
- Multi-column layouts
- Larger charts with legends on side
- Better use of whitespace
```

---

## 🎯 SUCCESS CRITERIA

### **Must Haves (P0):**

✅ Add, edit, delete expenses with all specified fields  
✅ Category CRUD with icon/color picker, cascade delete or move  
✅ Create category on-the-fly while adding expense  
✅ Adhoc expense marking and filtering  
✅ Analysis screen with pie chart (category breakdown) and bar chart (trends)  
✅ Time period filters (week, month, year, custom) for analysis  
✅ Export as CSV with flattened data  
✅ All data stored in IndexedDB via Dexie.js  
✅ Mobile-first responsive design  
✅ Dark mode default with light/system toggle  
✅ Home dashboard with monthly summary + recent transactions  
✅ **Search box filter on Recent Transactions and All Transactions views**  
✅ **Long-press to duplicate expense (copies all fields, updates date/time to current)**

### **Good to Haves (P1):**

✅ PWA support with offline functionality  
✅ Image attachment with compression (max 500KB)  
✅ Smart tag suggestions based on description  
✅ Tag management screen  
✅ JSON export/import  
✅ Auto-generated PWA icons and splash screens  
✅ Update notification banner for new versions

---

## 🚀 DELIVERABLES

Generate a complete, production-ready Vite + React + TypeScript application with:

1. **File Structure:**
   - `/src/components` - Reusable shadcn/ui components
   - `/src/pages` - Page components for each route
   - `/src/lib` - Utilities (db. ts, utils.ts)
   - `/src/hooks` - Custom React hooks
   - `/src/types` - TypeScript interfaces
   - `/public` - Static assets, PWA icons

2. **Key Files to Generate:**
   - `vite.config.ts` - With PWA plugin configuration
   - `src/lib/db.ts` - Dexie.js database setup
   - `src/App.tsx` - Main app with routing
   - `src/components/ui/*` - shadcn components (button, input, dialog, etc.)
   - All page components
   - `tailwind.config.js` - With dark mode support
   - `manifest.json` - PWA manifest

3. **Package Dependencies:**

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "dexie": "^3.2.4",
    "dexie-react-hooks": "^1.1.7",
    "recharts": "^2.10.0",
    "lucide-react": "latest",
    "date-fns": "^3.0.0",
    "browser-image-compression": "^2.0.2",
    "react-hook-form": "^7.49.0",
    "zod": "^3.22.4",
    "@hookform/resolvers": "^3.3.2",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.2.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.0",
    "vite": "^5.0.0",
    "vite-plugin-pwa": "^0.17.0",
    "typescript": "^5.3.0",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32"
  }
}
```

4. **Code Quality:**
   - Clean, well-commented code
   - TypeScript strict mode
   - Accessible components (aria labels, keyboard navigation)
   - Error handling and loading states
   - Toast notifications for user feedback

---

## 🎬 INITIALIZATION FLOW

On first app load:

1. Initialize IndexedDB with Dexie.js
2. Seed default categories (Food & Dining, Shopping, Transport, Medical, Bills, Entertainment, Others)
3. Check for existing data; if none, show welcome screen/onboarding (optional)
4. Check for theme preference (localStorage) or default to dark mode
5. Register service worker for PWA

---

## 💡 ADDITIONAL NOTES

- **Performance:** Use React.memo, useMemo, useCallback for expensive operations (chart rendering, large lists)
- **Accessibility:** Ensure all interactive elements are keyboard accessible, proper ARIA labels
- **Error Boundaries:** Wrap main app in error boundary for graceful failure
- **IndexedDB Limits:** Warn user if approaching storage quota (though unlikely for expenses)
- **No External APIs:** Everything is self-contained, no network calls
- **Data Privacy:** Mention in UI/footer: "All data stored locally on your device. We never see your data."

---

## 🔍 TESTING CHECKLIST

Before considering complete, verify:

- [ ] Can add expense with all fields
- [ ] Can edit and delete expense (with confirmation)
- [ ] Can duplicate expense via long-press (copies fields, updates date/time)
- [ ] Can create, edit, delete category (with cascade/move options)
- [ ] "Others" category cannot be deleted
- [ ] Can upload and view image attachments (compressed to <500KB)
- [ ] Tags are suggested intelligently based on description
- [ ] Search box filters transactions in real-time on home and all transactions views
- [ ] Analysis charts render correctly with filters
- [ ] Can filter by week/month/year/custom date range
- [ ] Adhoc expenses can be excluded from analysis
- [ ] Can export data as CSV and JSON
- [ ] App works fully offline (IndexedDB persists)
- [ ] PWA can be installed on mobile/desktop
- [ ] Dark/light/system theme toggle works
- [ ] Responsive on mobile (320px+), tablet, desktop
- [ ] All delete actions show confirmation dialogs
- [ ] Form validations work (max value, max tags, positive numbers)
- [ ] Long-press context menu works on mobile devices

---

## 🎨 DESIGN INSPIRATION

Style references:

- Clean, modern, card-based layouts (similar to Notion, Linear)
- Smooth transitions and micro-interactions
- shadcn/ui aesthetic (minimalist, functional, accessible)
- Color palette: Use shadcn default with custom accent colors for categories
- Typography: Inter or similar modern sans-serif

---

## 📝 USER INTERACTION PATTERNS

### **Long-Press Gesture:**

- On mobile: Long-press (750ms hold) triggers context menu
- On desktop: Right-click triggers context menu
- Context menu shows options in a bottom sheet (mobile) or popover (desktop)
- Options: Duplicate, Edit, Delete (with appropriate icons)

### **Search Behavior:**

- Real-time filtering (debounced by 300ms for performance)
- Case-insensitive matching
- Highlights matched text in results (optional enhancement)
- Shows "No results found" state when search yields no matches
- Search persists when navigating between tabs/routes (stored in app state)

---

**END OF COMPREHENSIVE PROMPT**

---

## 🎯 HOW TO USE THIS PROMPT

1. Copy this entire markdown file
2. Paste into AI coding tools like:
   - **Lovable** (lovable.dev)
   - **Bolt. new** (bolt.new)
   - **v0** (v0.dev)
   - **Cursor** (with Composer)
   - **GitHub Copilot Workspace**
3. Let the AI generate the complete application
4. Review and test the generated code
5. Deploy to static hosting (Vercel, Netlify, GitHub Pages)

---

## 📦 DEPLOYMENT NOTES

### **Build Command:**

```bash
npm run build
```

### **Recommended Hosting:**

- **Vercel** - Zero-config deployment for Vite apps
- **Netlify** - Great PWA support
- **GitHub Pages** - Free static hosting
- **Cloudflare Pages** - Fast global CDN

### **Environment Setup:**

No environment variables needed - fully client-side app!

---

## 🔄 VERSION HISTORY

- **v1.0** (2025-12-17) - Initial comprehensive prompt
  - Core expense CRUD
  - Category management
  - Tag system
  - Analysis charts
  - PWA support
  - Search functionality
  - Duplicate expense feature

---

**Created by:** gammaSpeck  
**Date:** 2025-12-17  
**Purpose:** One-shot prompt for AI coding tools to build a complete Expense Tracker PWA
