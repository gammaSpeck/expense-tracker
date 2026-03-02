# Expense Tracker - Feature Set

## Core Features

### 1. Expense Management

Complete CRUD operations for personal expense tracking:

- **Create** expenses with amount, category, description, tags, date/time
- **Edit** existing expenses with full data modification
- **Delete** expenses with confirmation dialog
- **Duplicate** expenses to quickly add similar transactions
- **View** detailed expense information with formatted dates and amounts
- **Attachments** support for images (compressed and stored as base64)

### 2. Category System

Customizable category management with visual organization:

- **Pre-seeded defaults**: Food & Dining, Shopping, Transport, Medical, Bills, Entertainment, Others
- **Create custom categories** with name, icon (from Lucide library), and color picker
- **Edit categories** to update appearance and naming
- **Delete categories** with two options:
  - Move expenses to another category
  - Cascade delete all associated expenses
- **Protected "Others" category** that cannot be deleted
- **36+ color palette** for visual distinction
- **Icon library** integration with 100+ Lucide icons

### 3. Tag Management

Smart tagging system for detailed expense categorization:

- **Auto-creation** of tags when added to expenses
- **Tag suggestions** based on usage frequency
- **Usage statistics** showing count and last used date
- **Rename tags** across all expenses
- **Delete tags** with expense count warning
- **Tag filtering** for quick expense searches
- **Max 4 tags** per expense for simplicity

### 4. Analysis & Insights

Comprehensive expense analytics with multiple visualizations:

- **Time Period Selection**: Week, Month, Year, Custom date range
- **Period Navigation**: Previous/Next navigation with date display
- **Category Breakdown**:
  - Pie chart visualization
  - Bar chart comparison
  - Percentage distribution
  - Total and count per category
- **Trend Analysis**:
  - Daily, weekly, or monthly aggregation
  - Line chart visualization
  - Adaptive granularity based on period
- **Summary Metrics**:
  - Total expenses
  - Transaction count
  - Average expense
  - Top spending category
- **Ad-hoc Filtering**: Toggle to include/exclude irregular expenses
- **Export from Analysis**: Direct export of filtered data

### 5. Search & Filtering

Powerful search capabilities across all expenses:

- **Full-text search** across descriptions, category names, and tags
- **Real-time filtering** as you type
- **All Transactions** dedicated page for complete expense list
- **Search highlighting** in results
- **Category filtering** for focused analysis
- **Tag-based filtering** for detailed queries
- **Date range filtering** for time-bound searches

### 6. Data Management

Accessible via **Settings → Data Management** (dedicated sub-screen).

#### Export

- **Format options**: JSON (default) or CSV
- **Always exports all data** — no date range filtering
- **JSON export** includes full expense data, category definitions, and export metadata
- **CSV export** with columns: Date, Time, Amount, Category, Description, Tags, Type

#### Backup Reminders & Export UX

- **Backup reminders**: user-configurable reminders (Never / Daily / Weekly / Monthly) to encourage regular exports. Shown once per qualifying day; reminders record last-shown and last-backup timestamps.
- **Startup prompt**: app shows a non-intrusive backup prompt on startup when a reminder is due; "Backup Now" opens the Export dialog.
- **Export defaults**: JSON is the recommended default (importable). CSV remains available for device export.
- **Filename convention**: exports use `extrack-backup-YYYY-MM-DD.json` (or `.csv`).
- **Settings**: reminder frequency is configurable from Settings → Data Management.

#### Import

- **JSON import** from previous exports only
- **Two merge modes** (Override is default):
  - **Override**: Replace all existing data
  - **Merge**: Add to existing data, skip duplicates
- **Import preview**: Shows expense count, category count, date range
- **Validation**: Checks file structure before import

#### Clear All Data

- **Complete data wipe**: Expenses, categories, tags, settings
- **Re-seeding**: Restores default categories
- **Confirmation dialog** with clear warnings
- **localStorage cleanup** for fresh start

### 7. Multi-Currency Support

International currency handling with locale formatting:

- **8 supported currencies**:
  - INR (Indian Rupee) - Default
  - USD (US Dollar)
  - EUR (Euro)
  - GBP (British Pound)
  - JPY (Japanese Yen)
  - CNY (Chinese Yuan)
  - AUD (Australian Dollar)
  - CAD (Canadian Dollar)
- **Locale-based formatting** for proper number display
- **Currency symbol** display throughout app
- **Persistent selection** saved to localStorage

### 8. Theme System

Flexible appearance customization:

- **Three theme modes**: Light, Dark (default), System
- **Icon-only toggle** in Settings — Sun / Moon / Monitor, all on one row
- **Persistent storage** of user preference
- **Dynamic system theme** switching
- **Tailwind CSS v4** powered styling

### 9. Progressive Web App (PWA)

Modern web app capabilities with offline support:

- **Installable** on mobile and desktop devices
- **Offline-first** architecture
- **Service Worker** for caching and updates
- **Update notifications** with reload prompt
- **Auto-dismissing notifications** for offline-ready status
- **Loading states** during updates
- **App manifest** with proper icons and metadata
- **Launch experience** as standalone app

### 10. Smart Input Features

#### Description Autocomplete

- **Historical suggestions** from past expenses
- **Fuzzy matching** for partial text
- **Real-time dropdown** (appears after 2 characters)
- **Click-to-fill** from suggestions
- **Top 10 matches** displayed

#### Tag Suggestions

- **Frequency-based ordering** of existing tags
- **Filtered suggestions** based on input
- **Excluded duplicates** (don't show already-added tags)
- **Context-aware filtering** by category
- **Quick-add buttons** for suggested tags

#### Category Quick-Create

- **In-form creation** without leaving expense entry
- **Immediate availability** of new categories
- **Dialog-based interface** for focused input
- **Color and icon selection** during creation

### 11. Ad-hoc Expense Tracking

Special handling for irregular expenses:

- **Toggle switch** in expense form
- **Visual indicators** (badge/icon) on expense cards
- **Filterable in analysis** to see regular spending patterns
- **Monthly summary** shows both totals (with/without ad-hoc)
- **Use cases**: One-time purchases, gifts, medical emergencies

### 12. Time Management

Precise tracking of when expenses occurred:

- **Date picker** with calendar UI
- **Time input** in 24-hour format
- **Current time default** when creating new expense
- **Compound indexing** [date+time] for sorting
- **Formatted display** with relative dates ("Today", "Yesterday", "2 days ago")

### 13. User Interface

#### Layout

- **Responsive design**: Mobile-first with desktop optimization
- **Bottom navigation** (mobile): Home, Categories, Analysis, Settings (cog icon)
- **Sidebar navigation** (desktop): Extended menu with Add button
- **Settings page** : Navigation hub for Theme, Currency, Data Management, and About App sub-screens
- **Floating Action Button** (mobile): Quick expense add
- **Max-width containers** (672px) for optimal readability

#### Components

- **shadcn/ui components**: Consistent, accessible UI primitives
- **Framer Motion animations**: Smooth page transitions and interactions
- **Lazy loading**: Performance optimization for charts
- **Context menus**: Long-press actions on mobile, right-click on desktop
- **Toast notifications**: User feedback for all actions
- **Alert dialogs**: Confirmation for destructive actions
- **Loading states**: Visual feedback during async operations

#### Interactions

- **Swipe gestures**: Natural mobile interactions
- **Long-press**: Context menu activation
- **Keyboard shortcuts**: Enter/Escape for forms
- **Touch-friendly targets**: 44px+ tap areas
- **Hover states**: Desktop interaction feedback

### 14. Data Privacy & Security

Complete local data management:

- **No backend server**: All data stays on device
- **IndexedDB storage**: Persistent local database
- **No analytics**: Zero tracking or telemetry
- **No user accounts**: No registration required
- **CORS isolation**: Data never transmitted
- **Open source**: Transparent codebase (MIT license)

### 15. Performance Optimizations

Fast and efficient user experience:

- **Vite build system**: Lightning-fast dev and production builds
- **React 18**: Latest framework performance
- **SWC compiler**: Faster than Babel
- **Code splitting**: Lazy-loaded components
- **Dexie.js**: Optimized IndexedDB access
- **React Query**: Efficient data caching
- **Image compression**: Browser-based compression for attachments
- **Virtual scrolling**: (Planned for large lists)

### 16. Developer Experience

Well-structured codebase:

- **TypeScript**: Full type safety
- **ESLint**: Code quality enforcement
- **Component organization**: Clear folder structure
- **Custom hooks**: Reusable data access patterns
- **Context providers**: Global state management
- **Utility libraries**: date-fns, clsx, zod for validation

---

## Technical Stack

- **Framework**: React 18.3.1 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS v4
- **Database**: IndexedDB via Dexie.js
- **UI Components**: Radix UI primitives via shadcn/ui
- **Icons**: Lucide React
- **Charts**: Recharts
- **Forms**: React Hook Form + Zod validation
- **Animations**: Framer Motion
- **PWA**: vite-plugin-pwa with Workbox
- **Date Utils**: date-fns
- **Image Processing**: browser-image-compression

---

## Planned Features (Roadmap)

- [ ] Recurring expenses automation
- [ ] Budget planning and alerts
- [ ] Multi-language support (i18n)
- [ ] More theme customization options
- [ ] Split expenses between multiple categories
- [ ] Receipt OCR for automatic data entry
- [ ] Cloud backup/sync (optional, privacy-first)
- [ ] Dashboard widgets/cards customization
- [ ] More chart types (donut, stacked bar, area)
- [ ] Expense comparison (month-over-month, year-over-year)
- [ ] Advanced filtering (amount ranges, date operators)
- [ ] Bulk operations (multi-select, batch edit/delete)
- [ ] Category groups/hierarchies
- [ ] Custom date formats
- [ ] Printing/PDF generation
