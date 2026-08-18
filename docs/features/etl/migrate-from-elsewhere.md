# Migrate from other apps

Other apps usually have an export as CSV option. To export all your expenses.
Building a feature that allows us to import the CSV from elsewhere and import it into this app is a good value add.

## Thinking about the flow

1. User exports CSV from App A. Columns and Rows.
2. During import into our app, user needs to map Columns from A to the Columns in ExTrack.
   EG: Date -> Date | Notes -> Description | Cost -> Value | etc
3. Once user creates mappings, CSV parser needs to parse uploaded file and move data one by one
4. Can request user to take a backup before and after

---

---

## Story Requirements

## CSV Import — Migrate from Another App

### Overview

Allow users to import expense data from any app that exports CSV. The user maps their CSV columns to ExTrack fields, defines category translation rules, and optionally configures row-ignore rules before the data is committed to the database. The CSV is processed entirely in the browser — no data is uploaded to any server.

### User Story

As a user switching to ExTrack from another expense tracking app,
I want to upload my exported CSV and map its columns and categories to ExTrack's format,
So that I can bring my historical expense data into ExTrack without losing it.

---

### Acceptance Criteria

#### File Upload & Parsing

- [ ] AC1: User can upload a `.csv` file from the Import Data screen
- [ ] AC2: The app uses **papaparse** to parse the CSV entirely in-browser. No data leaves the device.
- [ ] AC3: After successful parsing, a metadata summary is displayed before any mapping begins:
  - Total number of data rows
  - File size (human-readable, e.g. "2.4 MB")
  - List of all column names discovered (first row of the CSV)
- [ ] AC4: If the CSV exceeds **200,000 rows**, the upload is rejected with the message: "This file is too large to import. Please split it into files under 200,000 rows."
- [ ] AC5: If the file is not a valid CSV or is empty, a clear error message is shown and the user cannot proceed
- [ ] AC6: Once the import wizard is complete (success or abandoned), the parsed CSV data is cleared from browser memory

#### Backup Nudge

- [ ] AC7: Before the mapping screen is shown, the app displays a soft nudge to back up first
- [ ] AC8: The nudge shows the time of last backup (e.g., "Last backed up 3 days ago") if available, or "No backup found" if not
- [ ] AC9: User can dismiss the nudge and continue without backing up — it is not a blocker

#### Column Mapping

- [ ] AC10: The column mapping UI shows ExTrack's expense fields on the left and a dropdown of discovered CSV column headers on the right
- [ ] AC11: The following ExTrack fields are available for mapping:

  | ExTrack Field    | Required?    | Special Behavior                                                      |
  | ---------------- | ------------ | --------------------------------------------------------------------- |
  | Amount (`value`) | **Required** | Must parse to a positive number                                       |
  | Date             | **Required** | Supports regex extractor (see below)                                  |
  | Category         | **Required** | Drives the category value rules step; only one CSV column             |
  | Time             | Optional     | Supports regex extractor (see below); defaults to `00:00` if unmapped |
  | Description      | Optional     | Free text                                                             |
  | Tags             | Optional     | Multi-column mapping (see below)                                      |
  | Is Adhoc         | Optional     | Defaults to `false` if unmapped                                       |

  > `id`, `createdAt`, `updatedAt` are system-generated and not shown.

- [ ] AC12: **Amount**, **Date**, and **Category** are all required mappings. All other fields are optional.
- [ ] AC13: A live preview value (from the first data row of the CSV) is shown alongside each mapping row so the user can verify their selection
- [ ] AC14: Dropdowns include a "— Not mapped —" option for all optional fields
- [ ] AC15: Validation on "Next" highlights any unmapped required fields with an inline error

#### Date & Time Regex Extractors

- [ ] AC16: The **Date** mapping row includes an additional "Regex Extractor" text input, pre-populated with `(\d{2}\/\d{2}\/\d{4})` (extracts `DD/MM/YYYY`)
- [ ] AC17: The **Time** mapping row includes an additional "Regex Extractor" text input, pre-populated with `(\d{2}:\d{2}:\d{2})` (extracts `HH:mm:ss`)
- [ ] AC18: Both Date and Time can point to the **same CSV column** (e.g. a single `DateTime` column) with different regexes extracting different parts
- [ ] AC19: The extractor applies the regex to the raw CSV cell value and uses the **first capture group** as the extracted value. If the regex finds no match in a row, that row is flagged as having a date/time parse error.
- [ ] AC20: A live preview shows the extracted value (not the raw cell) next to the regex input so the user can confirm the pattern is working on real data
- [ ] AC21: If the user clears the regex field, the raw cell value is used as-is for parsing

#### Tags — Multi-Column Mapping

- [ ] AC22: The Tags field allows the user to select **multiple CSV columns** (multi-select or addable list)
- [ ] AC23: At import time, values from all selected columns for a given row are combined into the `tags` array for that expense
- [ ] AC24: Empty values from selected columns are ignored (not added as blank tags)
- [ ] AC25: Duplicate values across all mapped tag columns for the same row are deduplicated before writing to the DB (e.g. two columns both containing "Uber" results in a single `"Uber"` tag)

#### Category Value Rules

> **Terminology note:** "Column Mapping" (Step 3) maps a _source CSV column_ to an _ExTrack field_ — it is a structural, one-time setup. "Category Value Rules" (Step 4) maps specific _values found inside_ the source Category column to _ExTrack category records_. These are two distinct, non-conflicting operations.

- [ ] AC26: After column mapping, the app extracts all **unique values** from the single CSV column mapped to the Category field and displays them as a list
- [ ] AC27: For each unique value, the user can assign an ExTrack category via a dropdown (showing each category's color dot and name)
- [ ] AC28: Any value with no explicit rule applied falls through to the **default category**
- [ ] AC29: User must select a default category before proceeding — it is pre-filled with "Others" if that category exists
- [ ] AC30: If a row's Category cell is empty, it is not skipped — it is routed to the default category silently
- [ ] AC31: Subcategory columns from the source CSV are not used in category value rules and can be ignored

#### Ignore Row Rules

- [ ] AC32: The **Advanced Rules** section in the Category Value Rules step is collapsible and collapsed by default
- [ ] AC33: The section contains **system rules** — pre-set, locked, read-only rules the user cannot remove. They are displayed with a lock icon and a brief explanation. The system rules are:
  - **"Skip row if Date cell is empty"** — applies to the CSV column mapped to Date
  - **"Skip row if Amount cell is empty"** — applies to the CSV column mapped to Amount
- [ ] AC34: Below the system rules, the user can add one or more **custom Ignore Row Rules** of the form: `[CSV Column] == [value]`
  - The user selects a CSV column from a dropdown
  - The user enters a plain text value to match (case-sensitive string equality against the raw cell value)
  - Each custom rule has a remove (×) control
- [ ] AC35: Rows where **any** rule matches — system or custom — are skipped during import. They do not appear as data errors; they are counted separately.
- [ ] AC36: The import summary (preview step) shows skipped-by-rules count separately from skipped-due-to-data-errors count

#### Import Preview & Confirmation

- [ ] AC37: A summary screen is shown before final import:
  - Total rows in file
  - Rows that will be imported (valid)
  - Rows skipped by ignore rules (system + custom)
  - Rows skipped due to data errors (with row number and failing field listed)
- [ ] AC38: Below the summary counts, a **Transformed Data Preview table** shows 5–10 valid rows as they will be written to the DB — i.e. after all column mappings, regex extractions, category value rules, and tag deduplication have been applied. Columns shown: Date, Time, Amount, Category (ExTrack name), Description, Tags.
- [ ] AC39: A **search box** above the preview table lets the user filter visible rows by typing any value (searches across all displayed columns). The search only filters what is shown in the preview — it does not affect which rows are imported.
- [ ] AC40: Search results update as the user types (no submit needed). If no rows match the search term, show "No matching rows in preview".
- [ ] AC41: The preview table is read-only — rows cannot be edited in-flow.
- [ ] AC42: User can choose to proceed with valid rows only, or cancel entirely — there is no partial retry
- [ ] AC43: On confirmation, all valid rows are written to the `expenses` table via `bulkAdd`
- [ ] AC44: **Duplicate rows are not detected.** Each valid CSV row creates a new, distinct expense entity with a new system-generated ID. This is intentional — deduplication is out of scope for v1.
- [ ] AC45: On success, a confirmation message shows the count of expenses imported
- [ ] AC46: The user is not automatically navigated away — they can choose to go to Transactions or stay

---

### User Flow

1. User navigates to **Settings → Data Management → Import from CSV**
2. **Backup Nudge** (pre-wizard): App shows last backup time and a "Back up now" shortcut. User can dismiss and continue.
3. **Upload** (pre-wizard): User selects a `.csv` file via file picker. App parses it in-browser. A file metadata card is shown: row count, file size, discovered columns. A recognized source shows as a detected label with a "Next" button that applies it; otherwise the user clicks "Set up manually".
4. **Step 1 of 3 — Column Mapping**:
   - User maps CSV columns to ExTrack fields (structural mapping: source column → dest field)
   - Tags row allows multiple CSV columns to be selected
   - Required fields (Amount, Date, Category) must be filled before proceeding
5. User clicks "Next" → validation runs on required fields
6. **Step 2 of 3 — Category Value Rules**:
   - Unique values from the mapped Category column are extracted and listed
   - User assigns each value to an ExTrack category (value mapping: source value → dest category record)
   - User sets the default category fall-through (pre-filled: "Others"); empty category cells are quietly routed here
   - **Advanced Rules** section (collapsed): shows locked system rules + user can add custom `column == value` ignore rules
7. User clicks "Next" → **Step 3 of 3 — Import Preview**:
   - Counts: total / to import / skipped / errors
   - Error rows listed with row number and failing field
8. User clicks "Import" → data is written to DB → CSV data cleared from memory
9. **Done screen**: Success message with imported count, link to Transactions

_Step indicator: "Step X of 3" on Column Mapping, Category Value Rules, and Import Preview only — Backup Nudge and Upload are unlabeled pre-wizard screens; Done is a result screen._

---

### Edge Cases & Error States

| Scenario                                               | Expected Behavior                                                                  |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| Uploaded file is not a CSV                             | "File must be a .csv format" — user stays on upload screen                         |
| CSV has no header row or is empty                      | "This file appears to be empty or has no column headers"                           |
| CSV exceeds 200,000 rows                               | "This file is too large to import. Please split it into files under 200,000 rows." |
| `value` column has non-numeric data in a row           | Row flagged as a data error — skippable in preview                                 |
| Date regex extractor finds no match in a row           | Row flagged as a data error — raw cell value shown to help debug                   |
| Date cell is empty in a row                            | Row is silently skipped by system rule (not a data error)                          |
| Amount cell is empty in a row                          | Row is silently skipped by system rule (not a data error)                          |
| Category cell is empty in a row                        | Row is NOT skipped — routed to default category                                    |
| Required fields (Amount, Date, Category) left unmapped | Inline validation error on "Next" — cannot proceed                                 |
| No default category selected                           | Block on "Next" in Category Mapping — must be set                                  |
| 0 valid rows after all filters applied                 | "No valid rows to import" — import button is disabled                              |
| Ignore rule matches all rows                           | Preview shows 0 rows to import with explanation — import blocked                   |
| User uploads a second CSV                              | All mapping state is reset and wizard restarts from upload step                    |
| Import fails mid-write                                 | Entire transaction rolls back atomically (expenses, categories, tag metadata) — user sees "Import failed", never a partial-success count |
| User exits wizard mid-flow                             | CSV data is cleared from memory; no partial data is written                        |

---

### UX Notes

- Wizard pattern with a step indicator (e.g. "Step 3 of 5") — keeps the multi-step flow from feeling overwhelming
- ExTrack field names use human-readable labels: "Amount" not `value`, "Date" not `date`
- The live preview column in step 3 is the most important trust-building element — make it visually distinct
- For Date/Time regex fields, show the extracted value in a muted "preview" chip right next to the input, updated in real time as the user edits the regex
- Category mapping dropdowns show a color dot next to each category name
- The "Advanced Rules" section should use a subtle chevron/accordion pattern — it should not distract users who don't need it
- Ignore rule rows should have a clear "remove" (×) control per rule
- The Import Preview step should feel like a final checklist, not a wall of text — use counts prominently, collapse error rows under an expandable section if there are many

---

### Out of Scope (v1)

- Auto-detection / smart-guessing of column mappings
- Combined column rules for category (e.g. "Category + Subcategory" together)
- Deduplication detection — importing a CSV row that already exists in the DB will create a second distinct entity. This is intentional.
- Support for `.xlsx` or other non-CSV formats
- Editing individual rows in-flow before commit
- Saving/reusing mapping profiles for re-import from the same source app
- Case-insensitive or regex-based ignore rules (v1 is plain string equality only)

---

### Open Questions

_All questions resolved. No open items._
