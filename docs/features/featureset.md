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

Accessible via **Settings → Data Management** (dedicated sub-screen). The page is organised into three cards:

1. **Encryption** — passphrase setup and management (required before any backup)
2. **Backup** — reminders, Google Drive status, and backup creation
3. **Import & Export** — raw data dump (export) and restore (import)

#### End-to-End Encryption (E2EE)

All backups are always end-to-end encrypted. No unencrypted backup file ever leaves the device.

- **Algorithm**: AES-GCM 256-bit with PBKDF2-SHA256 key derivation (600,000 iterations)
- **Implementation**: Pure [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API) — zero additional packages
- **Passphrase storage**: Stored locally in IndexedDB via `idb-keyval`; never transmitted anywhere
- **Encrypted file format**: `.extrack` — a self-describing JSON envelope:
  ```json
  {
    "format": "extrack-encrypted-backup",
    "version": "1",
    "algorithm": "AES-GCM",
    "kdf": "PBKDF2-SHA256",
    "iterations": 600000,
    "salt": "<base64url-16bytes>",
    "iv": "<base64url-12bytes>",
    "ciphertext": "<base64url>"
  }
  ```
- **Forward compatibility**: iterations are stored per-file so future algorithm upgrades don't break old files
- **Unknown versions**: a backup whose `version` this app does not know (made by a newer ExTrack) is rejected when the file is picked, before any passphrase prompt; a version this browser cannot read gets a needs-newer-browser message
- **Passphrase UX** (Encryption card):
  - **Unset state**: shows `Passphrase: Unset` with a "Set Passphrase" button; clicking opens the setup modal
  - **Set state**: shows masked `●●●●●●●●●●●●` with an Eye icon (reveal) and Pencil icon (change)
  - **Change flow**: two-step — warning dialog (old files won't be re-encrypted) → new passphrase form
  - **Minimum length**: 8 characters
- **Backup gate**: attempting to create a backup without a passphrase opens the setup modal first; on completion, the backup dialog opens automatically
- **Factory reset**: clears the stored passphrase along with all other data

#### Backup

- **Always encrypted** — backups are written as `.extrack` files; no plaintext backup pathway exists
- **Save to device** or **Google Drive** (when connected)
- **Drive not connected**: shows a "Connect Drive" button that starts the OAuth flow inline — no separate settings screen required
- **Filename convention**: `extrack-backup-YYYY-MM-DD.extrack`
- **Duplicate handling**: backing up to Drive on the same day replaces the existing file (no duplicates)
- **Tracks last backup**: records date and destination (Device / Google Drive) for use in reminder display

#### Export Data

- **Device-only** — no Drive option; purely a data dump, not reminder-tracked
- **Format options**: JSON or CSV
- **Always exports all data** — no date range filtering
- **JSON export** includes full expense data, category definitions, and export metadata
- **CSV export** with columns: Date, Time, Category, Description, Value, Tags, IsAdhoc, Attachment
- **Filename convention**: `extrack-export-YYYY-MM-DD.json` / `.csv`

#### Google Drive Backup

- **Optional cloud backup** via Google Drive — no backend, fully client-side
- **PKCE OAuth 2.0** authentication with real refresh tokens (no repeated logins)
- **Auto-creates `ExTrack Backups` folder** in the user's Drive on first backup
- **Token auto-refresh**: access token silently refreshed before each upload; no popup for logged-in users
- **Inline account management** inside the Backup card:
  - Connected state: shows account email and folder name (`ExTrack Backups`) with an **Unlink** button
  - Disconnected state: shows a **Connect** button that starts the OAuth flow
  - Disconnecting revokes the token and clears credentials locally; Drive files are not deleted
- **Scope**: `drive.file` — app can only access files it created, not any other Drive content
- **No API key required** — all Drive calls use the user's OAuth access token only
- **"View in Drive ↗"** action in success toast after each cloud backup

#### Backup Reminders

- **User-configurable frequency**: Never / Daily / Weekly / Monthly
- Shown once per qualifying day; records last-shown and last-backup timestamps
- **Last backup display**: shows date, days elapsed, and destination — e.g. "Last backed up: 3 days ago · Device" or "Last backed up: today · Google Drive"
- **Startup prompt**: non-intrusive banner when a reminder is due; **"Backup Now"** opens the Backup dialog directly
- **Frequency setting** is in the Backup card on Settings → Data Management

#### Import

- **`.extrack` files only** — only encrypted backup files can be imported (plain JSON exports are not importable)
- **Auto-decrypt**: if a passphrase is stored, decryption happens silently on file selection
- **Manual passphrase fallback**: if no passphrase is stored (new device) or the stored one is wrong, a passphrase input is shown; the file stays loaded so the user can retry without re-selecting
- **Wrong passphrase detection**: AES-GCM authentication tag failure maps to a clear "Wrong passphrase — try again" error
- **CSV export guard**: encrypted CSV exports from older versions show an error ("This file is an encrypted CSV export from an older version and can't be restored.") and are rejected
- **Two merge modes** (Override is default):
  - **Override**: Replace all existing data
  - **Merge**: Add to existing data, skip duplicates
- **Import preview**: Shows expense count, category count, date range
- **Large files**: the app asks before reading a file over the threshold
- **Unfinished restore**: at the next start the app says the last restore didn't finish
- **Validation**: Checks encrypted envelope structure and backup JSON shape before import

#### Clear All Data

- **Complete data wipe**: Expenses, categories, tags, settings, encryption passphrase
- **Re-seeding**: Restores default categories
- **Confirmation dialog** with clear warnings
- **Full storage cleanup**: clears IndexedDB (Dexie) and idb-keyval store for a fresh start

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

Complete local data management with end-to-end encryption:

- **No backend server**: All data stays on device (or user's own Google Drive)
- **End-to-end encryption**: Backups are always encrypted with AES-GCM 256 before leaving the device — not even a Google Drive admin can read them
- **Zero-knowledge design**: The passphrase is stored only in the user's own IndexedDB; it is never transmitted, logged, or accessible to anyone else
- **Strong key derivation**: PBKDF2-SHA256 with 600,000 iterations makes brute-force attacks computationally infeasible
- **Pure Web Crypto API**: Encryption uses the browser's native cryptography primitives — no third-party crypto library is bundled
- **Self-describing encrypted files**: The `.extrack` format stores algorithm parameters per-file, enabling future algorithm upgrades without breaking old backups
- **IndexedDB storage**: Persistent local database
- **No analytics**: Zero tracking or telemetry
- **No user accounts**: No registration required
- **CORS isolation**: Data never transmitted to any third party
- **Google Drive integration**: OAuth tokens stored in IndexedDB, scoped to `drive.file` only; tokens never logged or sent anywhere except `googleapis.com`
- **Open source**: Transparent codebase (MIT license)

### 15. Performance Optimizations

Fast and efficient user experience:

- **Vite build system**: Lightning-fast dev and production builds
- **React 18**: Latest framework performance
- **SWC compiler**: Faster than Babel
- **Code splitting**: Lazy-loaded components
- **Dexie.js**: Optimized IndexedDB access
- **idb-keyval**: Lightweight key-value IndexedDB store for credentials and preferences
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
- **Cryptography**: Web Crypto API (AES-GCM 256, PBKDF2-SHA256) — built into the browser, zero extra packages

---

## Planned Features (Roadmap)

- [ ] Recurring expenses automation
- [ ] Budget planning and alerts
- [ ] Multi-language support (i18n)
- [ ] More theme customization options
- [ ] Split expenses between multiple categories
- [ ] Receipt OCR for automatic data entry
- [x] Cloud backup/sync via Google Drive (optional, privacy-first, PKCE OAuth, no backend)
- [x] End-to-end encryption for backups (AES-GCM 256, PBKDF2-SHA256, `.extrack` format, pure Web Crypto API)
- [ ] Dashboard widgets/cards customization
- [ ] More chart types (donut, stacked bar, area)
- [ ] Expense comparison (month-over-month, year-over-year)
- [ ] Advanced filtering (amount ranges, date operators)
- [ ] Bulk operations (multi-select, batch edit/delete)
- [ ] Category groups/hierarchies
- [ ] Custom date formats
- [ ] Printing/PDF generation
